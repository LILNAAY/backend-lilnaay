const express = require("express");
const cors = require("cors");

// 🔥 STRIPE (USA VARIABLE DE ENTORNO EN RENDER)
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// 🔥 FIREBASE ADMIN
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   🧪 RUTA DE PRUEBA
========================= */
app.get("/", (req, res) => {
    res.send("🔥 Backend funcionando correctamente");
});

/* =========================
   🔥 STRIPE PAYMENT
========================= */
app.post("/crear-pago", async (req, res) => {
    try {
        const { productos, cliente } = req.body;

        console.log("🛒 Productos:", productos);
        console.log("👤 Cliente:", cliente);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: productos.map(p => ({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: p.nombre
                    },
                    unit_amount: p.precio * 100
                },
                quantity: 1
            })),
            mode: "payment",

            // 🔥 CAMBIA ESTO POR TU URL REAL DE GITHUB
            success_url: "https://TU-USUARIO.github.io/TU-REPO/success.html",
            cancel_url: "https://TU-USUARIO.github.io/TU-REPO/cancel.html",

            metadata: {
                nombre: cliente.nombre,
                correo: cliente.correo,
                pais: cliente.pais
            }
        });

        // 🔥 GUARDAR COMPRA EN FIREBASE
        await db.collection("compras").add({
            cliente,
            productos,
            estado: "pendiente",
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("✅ Compra guardada en Firebase");

        res.json({ url: session.url });

    } catch (error) {
        console.error("❌ ERROR STRIPE:", error);
        res.status(500).json({ error: error.message });
    }
});

/* =========================
   🔥 SUSCRIPCIONES FIREBASE
========================= */

// 👉 Guardar suscriptor
app.post("/suscribir", async (req, res) => {
    try {
        const { email } = req.body;

        console.log("📩 Email recibido:", email);

        if (!email) {
            return res.json({ error: "Email requerido" });
        }

        const ref = db.collection("suscriptores");

        const snapshot = await ref.where("email", "==", email).get();

        if (!snapshot.empty) {
            return res.json({ mensaje: "Ya suscrito" });
        }

        await ref.add({
            email,
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("✅ Usuario guardado en Firebase");

        res.json({ mensaje: "Suscrito correctamente" });

    } catch (error) {
        console.error("❌ ERROR REAL:", error);
        res.status(500).json({ error: "Error en servidor" });
    }
});

// 👉 Obtener total de suscriptores
app.get("/suscriptores", async (req, res) => {
    try {
        const snapshot = await db.collection("suscriptores").get();

        res.json({
            total: snapshot.size
        });

    } catch (error) {
        console.error("❌ ERROR CONTADOR:", error);
        res.status(500).json({ error: "Error en servidor" });
    }
});

/* =========================
   🚀 SERVIDOR (RENDER READY)
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🔥 Servidor corriendo en puerto " + PORT);
});