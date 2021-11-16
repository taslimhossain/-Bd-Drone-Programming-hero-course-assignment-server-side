const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId

const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9y5qt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {

    if (req.headers?.authorization?.startsWith('Bearer ')) {

        const token = req.headers.authorization.split(' ')[1];
        console.log(token);
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {
        }
    }
    next();

}

async function run() {

    try {

        await client.connect();
        const database = client.db('bddrone');
        const productsCollection = database.collection('products');
        const ordersCollection = database.collection('order');
        const reviewCollection = database.collection('review');
        const usersCollection = database.collection('users');


        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.json(result)
        });

        app.get('/review', async (req, res) => {
            const cursor = reviewCollection.find();
            const review = await cursor.toArray();
            res.json(review);
        })


        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.json(result)
        });

        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find();
            const products = await cursor.toArray();
            res.json(products);
        })

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.json(product);
        });

        // Delete Product
        app.delete('/product/:id', async (req, res) => {
             const id = req.params.id;
             const query = { _id: ObjectId(id) };
             const result = await productsCollection.deleteOne(query);
             res.json(result);
         })


        app.post('/order', async (req, res) => {
            const orderData = req.body;
            const result = await ordersCollection.insertOne(orderData);
            res.json(result)
        });

        app.get('/order', async (req, res) => {
            const email = req.query.email;
            let query = {};
            if(email){
                 query = { email: email };
            }
            const cursor = ordersCollection.find(query);
            const products = await cursor.toArray();
            res.json(products);
        })

        app.put('/order/:id', async (req, res) => {
            const id = req.params.id;
            const updateOrder = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: updateOrder.status
                },
            };
            const result = await ordersCollection.updateOne(filter, updateDoc, options)
            res.json(result)
        })

        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
        })        

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            console.log(user);
            const requester = req.decodedEmail;
            if (requester) {
                
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    console.log(result);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'Sorry you can not make a admin' })
            }

        })

    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Bd drone portal!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})