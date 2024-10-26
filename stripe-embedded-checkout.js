document.addEventListener('DOMContentLoaded', function () {
    var nextButton = document.getElementById('next'); 

    nextButton.addEventListener('click', function () {

        var dataFetched = false; 
 
        setTimeout(function() {
            let nextStep = localStorage.getItem('nextStep');
            if(nextStep){
                if (!dataFetched) {
                    var costDetails = JSON.parse(localStorage.getItem('costDetails'));
                    var formData = JSON.parse(localStorage.getItem('formData'));

                    if (costDetails && formData) {
                        dataFetched = true; 
                        var totalCost = costDetails.totalCost; 
                        var travelerQnty = costDetails.travelerQnty;
                        var generalDetails = formData.generalDetails;
                        var travelers = formData.travelers;
                        var stripe = Stripe(stripe_checkout_params.stripe_publishable_key);

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
                                var elements = stripe.elements({ clientSecret: result.data.clientSecret });

                                var paymentElement = elements.create('payment');
                                paymentElement.mount('#payment-element');

                                var form = document.getElementById('payment-form');
                                form.addEventListener('submit', function (event) {
                                    event.preventDefault();

                                    stripe.confirmPayment({
                                        elements,
                                        confirmParams: {
                                            return_url: 'https://portfolio-wordpress.tapabrata.me/plugintest/'
                                        }
                                    }).then(function (result) {
                                        if (result.error) {
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
                    }
                }
            }
        },3000);
        
    });
});

