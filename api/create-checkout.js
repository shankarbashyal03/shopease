const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { items } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: 'No items' });

        const domain = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:8000';

        const lineItems = items.map(item => ({
            price_data: {
                currency: 'aed',
                product_data: { name: item.name },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${domain}/sucess.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${domain}/cancel.html`,
            shipping_address_collection: {
                allowed_countries: ['AE'],
            },
        });

        return res.status(200).json({ url: session.url });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}