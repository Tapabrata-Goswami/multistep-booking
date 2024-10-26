document.addEventListener('DOMContentLoaded', function () {
    var nextButton = document.getElementById('next'); // Replace with your actual button ID

    nextButton.addEventListener('click', function () {
        var dataFetched = false; 
        setTimeout(function() {
        // Check if data has already been fetched
        if (!dataFetched) {

        // Retrieve cost details and form data from localStorage
        var costDetails = JSON.parse(localStorage.getItem('costDetails'));
        var formData = JSON.parse(localStorage.getItem('formData'));
        
        if (costDetails && formData) {
             dataFetched = true; 
        
        // Extract values
        var totalCost = costDetails.totalCost; // Already in cents
        var travelerQnty = costDetails.travelerQnty;
        var generalDetails = formData.generalDetails;
        var travelers = formData.travelers;
        
        console.log(totalCost);

        // Initialize Stripe
        var stripe = Stripe(stripe_checkout_params.stripe_publishable_key);

        // Create payment intent
        fetch(stripe_checkout_params.ajax_url + '?action=create_payment_intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                totalCost: totalCost,
                travelerQnty: travelerQnty,
                generalDetails: generalDetails,
                travelers: travelers
            })
        })
        .then(function (response) {
            return response.json();
        })
        .then(function (result) {
            if (result.success) {
                // Use Stripe Elements to handle the payment
                var elements = stripe.elements({ clientSecret: result.data.clientSecret });

                var paymentElement = elements.create('payment');
                paymentElement.mount('#payment-element');

                var form = document.getElementById('payment-form');
                form.addEventListener('submit', function (event) {
                    event.preventDefault();

                    stripe.confirmPayment({
                        elements,
                        confirmParams: {
                            return_url: 'https://portfolio-wordpress.tapabrata.me/plugintest/' // Replace with your actual thank you page URL
                        }
                    }).then(function (result) {
                        if (result.error) {
                            document.getElementById('error-message').textContent = result.error.message;
                        } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                            
                        
                            // Handle payment success
                            // var userData = {
                            //     action: 'payment_success',
                            //     payment_intent_id: result.paymentIntent.id,
                            //     totalCost: totalCost,
                            //     travelerQnty: travelerQnty,
                            //     generalDetails: generalDetails,
                            //     travelers: travelers
                            // };

                            // // Send user data to server for email confirmation
                            // fetch(stripe_checkout_params.ajax_url, {
                            //     method: 'POST',
                            //     headers: {
                            //         'Content-Type': 'application/json'
                            //     },
                            //     body: JSON.stringify(userData)
                            // })
                            // .then(function (response) {
                            //     return response.json();
                            // })
                            // .then(function (data) {
                            //     if (data.success) {
                            //         alert('Payment successful and email sent!');
                            //     } else {
                            //         console.error('Error:', data.message);
                            //     }
                            // })
                            // .catch(function (error) {
                            //     console.error('Error:', error);
                            // });
                            
                            // var costDetails = JSON.parse(localStorage.getItem('costDetails'));
                            // var formData = JSON.parse(localStorage.getItem('formData'));
                            
                            // if (costDetails && formData) {
                            //      dataFetched = true; 
                            
                            // // Extract values
                            // var totalCost = costDetails.totalCost; // Already in cents
                            // var travelerQnty = costDetails.travelerQnty;
                            // var generalDetails = formData.generalDetails;
                            // var travelers = formData.travelers;
                            
                            // fetch('https://portfolio-wordpress.tapabrata.me/plugintest/wp-json/custom/v1/send-booking-email', {
                            //     method: 'POST',
                            //     headers: {
                            //         'Content-Type': 'application/json',
                            //     },
                            //     body: JSON.stringify({
                            //         totalCost: totalCost,
                            //         travelerQnty: travelerQnty,
                            //         generalDetails: generalDetails,
                            //         travelers: travelers
                            //     })
                            // })
                            // .then(response => response.json())
                            // .then(data => {
                            //     if (data.success) {
                            //         console.log(data);
                            //     } else {
                            //         console.error(data);
                            //     }
                            // })
                            // .catch(error => console.error('Error:', error));
                            
                            
                            
                            
                            
                            
                            
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
        }
        }
        },3000);

    });
});

