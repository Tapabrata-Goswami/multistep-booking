document.addEventListener('DOMContentLoaded', function () {
    var stripe = Stripe(stripe_checkout_params.stripe_publishable_key); // Use the publishable key
    console.log(stripe_checkout_params.ajax_url);
    // Get the Payment Intent client secret from the server
    fetch(stripe_checkout_params.ajax_url + '?action=create_payment_intent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(function (response) {
        return response.json();
    })
    .then(function (result) {
        if (result.success) {
            var elements = stripe.elements({ clientSecret: result.data.clientSecret });

            var paymentElement = elements.create('payment');
            paymentElement.mount('#payment-element');

            // Handle form submission
            var form = document.getElementById('payment-form');
            form.addEventListener('submit', function (event) {
                event.preventDefault();

                stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        // Return URL where Stripe will redirect after payment completion (optional)
                        return_url: 'https://yourdomain.com/order-confirmation',
                    }
                }).then(function (result) {
                    if (result.error) {
                        // Show error to your customer
                        document.getElementById('error-message').textContent = result.error.message;
                    }
                });
            });
        } else {
            console.error('Error fetching Payment Intent client secret:', result);
        }
    })
    .catch(function (error) {
        console.error('Error:', error);
    });
});
