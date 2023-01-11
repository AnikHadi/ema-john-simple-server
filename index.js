const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//Middle ware
app.use(cors());
app.use(express.json());

//MongoDB

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASSWORD}@cluster0.17kyq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const productsCollection = client
      .db("ema-john-simple")
      .collection("products");
    console.log("successfully connect MongoDB");

    app.get("/products", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const query = {};
      const cursor = productsCollection.find(query);
      let products;
      if (page || size) {
        // 0--> skip: 0*10 get: 0-10 (10)
        // 1--> skip: 1*10 get: 11-20 (10)
        // 2--> skip: 2*10 get: 21-30 (10)
        // 3--> skip: 3*10 get: 31-10 (10)
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }

      res.send(products);
    });

    app.get("/productCount", async (req, res) => {
      const count = await productsCollection.estimatedDocumentCount();
      res.send({ count });
    });

    //use post to get by ID
    app.post("/productsByKeys", async (req, res) => {
      const keys = req.body;
      const ids = keys.map((id) => ObjectId(id));
      const query = { _id: { $in: ids } };
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    //post products submit
    app.post("/addProduct", async (req, res) => {
      const data = req.body;
      const result = await productsCollection.insertOne(data);
      res.send(result);
    });

    //get single Products
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    //Delete Single Products
    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    //update Products data
    app.put("/updateProduct/:id", async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateInfo = { $set: data };
      const result = await productsCollection.updateOne(
        filter,
        updateInfo,
        options
      );
      res.send(result);
    });

    //post order details
    const ordersCollection = client.db("ema-john-simple").collection("orders");

    const ordersHistoryCollection = client
      .db("ema-john-simple")
      .collection("ordersHistory");

    app.post("/order", async (req, res) => {
      const data = req.body;
      const query = { email: data.email };
      let result;
      const cursor = ordersCollection.find(query);
      const oldOrderResult = await cursor.toArray();
      if (oldOrderResult.length !== 0) {
        const cursorHistory = ordersHistoryCollection.find(query);
        const orderHistory = await cursorHistory.toArray();

        if (orderHistory.length !== 0) {
          console.log("orderHistory", orderHistory);
          orderHistory[0].orders.push(oldOrderResult[0]?.orders[0]);
          delete orderHistory[0]._id;
          await ordersHistoryCollection.deleteOne(query);
          await ordersHistoryCollection.insertOne(orderHistory[0]);
          //new orderCollection management
          await ordersCollection.deleteOne(query);
          result = await ordersCollection.insertOne(data);
        } else {
          console.log("Inside");
          await ordersHistoryCollection.insertOne(oldOrderResult[0]);
          //new orderCollection management
          await ordersCollection.deleteOne(query);
          result = await ordersCollection.insertOne(data);
        }
      } else {
        result = await ordersCollection.insertOne(data);
        console.log("Click");
      }
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// universal
app.get("/", (req, res) => {
  res.send("Successfully create ema john simple server.");
});

app.listen(port, () => {
  console.log("ema john server connected to port: ", port);
});
