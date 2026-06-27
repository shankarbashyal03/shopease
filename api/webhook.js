const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Send order to Google Sheets
        const orderData = {
            order_id: session.id,
            customer_name: session.customer_details?.name || '',
            customer_email: session.customer_details?.email || '',
            products: JSON.parse(session.metadata?.products || '[]'),
            total_amount: session.amount_total / 100,
            payment_method: 'card',
            payment_id: session.payment_intent,
            emirate: session.shipping_details?.address?.state || '',
            city: session.shipping_details?.address?.city || '',
            street: session.shipping_details?.address?.line1 || '',
        };

        try {
            await fetch(process.env.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
        } catch (err) {
            console.error('Failed to save order:', err);
        }
    }

    return res.status(200).json({ received: true });
}