const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format } = require("date-fns");

const app = express();

app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const InitializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
InitializeDbAndServer();

function AuthenticateTodo(request, response, next) {
  const requestQuery = request.query;
  if (requestQuery.status === undefined) {
    response.status(400);
    response.send("Invalid Todo Status");
  }
  if (requestQuery.priority === undefined) {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
  if (requestQuery.category === undefined) {
    response.status(400);
    response.send("Invalid Todo Category");
  }
  if (requestQuery.dueDate === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
}
const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};
const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};
const hasPriorityAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};
const hasCategoryAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const convertTodoRequestObj = (getDateTodo) => {
  const date = new Date(getDateTodo.due_date);
  const newDate = format(date, "yyyy-MM-dd").toString();
  return {
    id: getDateTodo.id,
    todo: getDateTodo.todo,
    priority: getDateTodo.priority,
    status: getDateTodo.status,
    category: getDateTodo.priority,
    dueDate: newDate,
  };
};

app.get("/todos/", AuthenticateTodo, async (request, response) => {
  const { status, search_q = "", priority, category } = request.query;
  let todoData = null;
  const getTodoQuery = "";
  switch (true) {
    case hasStatusProperty(request.query):
      getTodoQuery = ` 
            SELECT
             *
            FROM
            todo 
             WHERE
           todo LIKE '%${search_q}%'
           AND status = '${status}';
            `;
      break;
    case hasPriorityProperty(request.query):
      getTodoQuery = ` 
             SELECT *
             FROM 
             todo 
             WHERE
             todo LIKE '%${search_q}%'
             AND
             priority = '${priority}';
             `;
      break;
    case hasPriorityAndStatusProperty(request.query):
      getTodoQuery = ` 
            SELECT *
            FROM todo 
            WHERE
             todo LIKE '%${search_q}%' AND
             priority = '${priority}' AND 
             status = '${status}'
            `;
      break;
    case hasCategoryProperty(request.query):
      getTodoQuery = ` 
            SELECT * 
            FROM todo
            WHERE
            todo LIKE '%${search_q}%' AND
             category = '${category}';
            `;
      break;
    case hasCategoryAndStatusProperty(request.query):
      getTodoQuery = ` 
            SELECT *
            FROM todo 
            WHERE
            todo LIKE '%${search_q}%' AND
            category = '${category}' AND 
            status = '${status}'
            `;
      break;
    case hasCategoryAndPriorityProperty(request.query):
      getTodoQuery = ` 
            SELECT *
            FROM todo 
            WHERE
            todo LIKE '%${search_q}%' AND
            category = '${category}' AND 
            priority = '${priority}'
            `;
      break;
    default:
      getTodoQuery = `
             SELECT
             *
             FROM
             todo 
            WHERE
            todo LIKE '%${search_q}%'`;
  }

  todoData = await db.all(getTodoQuery);
  response.send(todoData);
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoBasedIDQuery = ` 
    SELECT * FROM 
    todo 
    WHERE 
    id = ${todoId}
    `;
  const todoArray = await db.get(getTodoBasedIDQuery);
  response.send(todoArray);
});

app.get("/agenda/", AuthenticateTodo, async (request, response) => {
  const { dueDate } = request.query;

  const getTodoBasedDateQuery = ` 
        SELECT *
        FROM 
        todo
        WHERE
        due_date = '${dueDate}';
    `;
  const getDateTodo = await db.get(getTodoBasedDateQuery);
  response.send(convertTodoRequestObj(getDateTodo));
});

app.post("/todos/", AuthenticateTodo, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const creteTodoDBQuery = ` 
    INSERT INTO 
    todo 
    (id,todo, priority, status, category, due_date)
    VALUES 
    (
         ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${dueDate}'
    );
    `;
  await db.run(creteTodoDBQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", AuthenticateTodo, async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  const updateColumn = "";

  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTdoQuery = ` 
    SELECT * 
    FROM 
    todo 
    WHERE 
    id = ${todoId};
    `;
  const previousTodo = await db.get(previousTdoQuery);

  const {
    status = previousTodo.status,
    priority = previousTodo.priority,
    todo = previousTodo.todo,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateDBTodoQuery = `
    UPDATE 
    todo 
    SET 
    status = '${status}',
    priority =  '${priority}',
    todo = '${todo}',
    category = '${category}',
    due_date = '${dueDate}'
    WHERE 
     id = ${todoId};
    `;
  await db.run(updateDBTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteDbQuery = ` 
      DELETE FROM
      todo 
      WHERE
      id = ${todoId};
   `;
  await db.run(deleteDbQuery);
  response.send("Todo Deleted");
});

module.exports = app;
