<?php

/*
 * Plugin Name:       Multistep Payment
 * Description:       Multistep form with payment functionality.
 * Version:           1.0.1
 * Author:            Tapabrata Goswami
 * Author URI:        https://www.linkedin.com/in/tapabrata-goswami/
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 */

function multistep_form_enqueue_bootstrap() {
    global $wp_styles;

    $bootstrap_enqueued = false;
    
    foreach($wp_styles->registered as $handle => $style) {
        if (strpos($style->src, 'bootstrap') !== false) {
            $bootstrap_enqueued = true;
            break;
        }
    }

    if (!$bootstrap_enqueued) {
        wp_enqueue_style('bootstrap-css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');
        wp_enqueue_script('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js', array('jquery'), null, true);
    }
    wp_enqueue_style('flatpickr-css', 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css');
    
    // Enqueue Flatpickr JS
    wp_enqueue_script('flatpickr-js', 'https://cdn.jsdelivr.net/npm/flatpickr', array('jquery'), null, true);

    wp_enqueue_style('multistep-form-style', plugins_url('style.css', __FILE__));
    wp_enqueue_script('multistep-form-script', plugins_url('script.js', __FILE__), array('jquery'), null, true);
}
add_action('wp_enqueue_scripts', 'multistep_form_enqueue_bootstrap');
add_action('wp_enqueue_scripts', 'multistep_form_enqueue_bootstrap');


function enqueue_stripe_checkout_scripts() {
    wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', array(), null, true);
    wp_enqueue_script('stripe-embedded-checkout', plugins_url('/stripe-embedded-checkout.js', __FILE__), array('jquery'), null, true);

    // Localize script with necessary data
    wp_localize_script('stripe-embedded-checkout', 'stripe_checkout_params', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'stripe_publishable_key' => 'pk_test_51BTUDGJAJfZb9HEBwDg86TN1KNprHjkfipXmEDMb0gSCassK5T3ZfxsAbcgKVmAIXF7oZ6ItlZZbXO6idTHE67IM007EwQ4uN3' // Replace with your real publishable key
    ));
}
add_action('wp_enqueue_scripts', 'enqueue_stripe_checkout_scripts');

function create_payment_intent() {
    // require_once 'vendor/autoload.php';
    require_once plugin_dir_path(__FILE__) . 'vendor/autoload.php';// Ensure Stripe PHP SDK is included

    \Stripe\Stripe::setApiKey('sk_test_tR3PYbcVNZZ796tH88S4VQ2u'); // Use your actual secret key here

    $customer_name = "John Doe"; // Replace with actual customer name
    $customer_address = [
        'line1' => '123 Street Name', // Replace with actual address line 1
        'city' => 'City Name',         // Replace with actual city
        'state' => 'State Name',       // Replace with actual state
        'postal_code' => '123456',     // Replace with actual postal code
        'country' => 'IN',             // Country code (IN for India)
    ];

    try {
        $payment_intent = \Stripe\PaymentIntent::create([
            'amount' => 1000, // Amount in cents ($10.00)
            'currency' => 'usd',
            'description' => 'Your payment description for export transaction', // Add your description here
            'metadata' => [
                'customer_name' => $customer_name, // Add customer name to metadata
                'customer_address' => json_encode($customer_address), // Add customer address to metadata
            ],
            'shipping' => [
                'name' => $customer_name,
                'address' => $customer_address,
            ],
        ]);

        wp_send_json_success(['clientSecret' => $payment_intent->client_secret]);
    } catch (Exception $e) {
        wp_send_json_error(['message' => $e->getMessage()]);
    }
}
add_action('wp_ajax_create_payment_intent', 'create_payment_intent');
add_action('wp_ajax_nopriv_create_payment_intent', 'create_payment_intent');




// Shortcode to display the form
function multistep_form_shortcode() {
    ob_start();
    ?>
    <!-- Multi Step form start-->
    <div class="container-fluid main-form-container">
        <div class="container p-5">
            <div class="col-12 d-flex align-items-center">
                <h4 class="mb-0 main-heading-form">Your personal details</h4>
                <div style="flex-grow: 1; height: 1px; background-color: #ccc; margin-left: 10px;"></div>
            </div>
            <form id="traveler-form" class="mt-5" action="">
                <!-- First Traveler Card -->
                <div class="traveler-card">
                    <div class="card-header pb-3 card-heading-container">
                        <h4 class="h5" style="color:#545454;">Primary Traveler</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="">First Name</label>
                                    <input type="text" class="form-control" placeholder="First Name" name="first-name" id="">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="">Last Name</label>
                                    <input type="text" class="form-control" placeholder="Last Name" name="last-name" id="">
                                </div>
                            </div>
                            
                        </div>
                        <div class="row mt-3">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="">Date of birth</label>
                                    <input type="text" class="form-control" placeholder="Date of Birth" name="dob" id="dob" data-toggle="flatpickr">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="gender">Gender</label>
                                    <select id="gender" name="gender" class="form-control">
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                            </div>
                            
                        </div>
                        <div class="row mt-3">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="passport">Upload Passport</label>
                                    <div class="custom-file">
                                        <input type="file" class="custom-file-input" id="passport" onchange="showFileName(this)" name="passport">
                                        <label class="custom-file-label" for="passport">Choose file</label>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="photo">Upload photo (51mm by 51mm)</label>
                                    <div class="custom-file">
                                        <input type="file" class="custom-file-input" id="photo" onchange="showFileName(this)" name="photo">
                                        <label class="custom-file-label" for="photo">Choose file</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <hr class="divider">
                    </div>
                </div>
                <!-- Add Traveler Button -->
                <div class="row mt-2">
                    <div class="col-md-12 text-center">
                        <button type="button" id="add-traveler-btn" class="btn btn-outline-primary text-center">
                            <i class="fas fa-user-plus"></i> Add Traveler
                        </button>
                    </div>
                </div>
                <div class="row pt-5">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="">Phone</label>
                            <input type="tel" placeholder="Enter your phone number" class="form-control" name="phone" id="">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="">Date of Arrival</label>
                            <input type="text" class="form-control" placeholder="Date of Arrival" name="arrival" id="arrival" data-toggle="flatpickr">
                        </div>
                    </div>
                    
                </div>
                <div class="row">
                        <div class="col-md-6">
                            <label for=""></label>
                            <div class="form-group">
                                <label for="">Email</label>
                                <input type="email" placeholder="Enter your email address" class="form-control" name="email" id="">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label for=""></label>
                            <div class="form-group">
                                <label for="">Confirm Email</label>
                                <input type="email" placeholder="Enter your email address" class="form-control" name="email" id="">
                            </div>
                        </div>
                </div>
                <hr class="divider">
                <div class="row mt-5">
                    <div class="col-md-12 text-center">
                        <button type="button" id="next" class="btn btn-lg btn-primary">Next</button>
                    </div>
                </div>
            </form>
        </div>



    </div>

    <div class="container-fluid p-5">
        <div id="submitted-details" class="container pt-5" style="display:none">
            
            <div class="row gap-">
                
                <div class="col-md-6">
                    <h3>Traveler Details</h3>
                    <div id="traveler-details-list" >

                    </div>
                </div>
                <div class="col-md-6 sticky-part">
                    <h3>Payment Calculation</h3>
                    <div class="row">
                        <div class="col-md-12">
                            <h5 class="h4">Choose the service you require <span style="color:red;">*</span></h5>
                            <div class="form-group mt-3">
                                <input type="radio" name="service" id="standardService" value="60"> <span id="title-60">Standard service: E-visa within 3 Days - $60.00</span>
                            </div>
                            <div class="form-group">
                                <input type="radio" name="service" id="priorityService" value="100"><span id="title-100"> Priority service: E-visa within 24 Hours - $100.00</span>
                            </div>

                            <h5 class="h4 mt-5">Total</h5>
                            <table class="table-of-total mt-3">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Quantity</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>

                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th>Total</th>
                                        <th></th>
                                        <th>$60</th>
                                    </tr>
                                </tfooter>
                            </table>
                            
                        </div>
                    </div>

                    <div class="row mt-5 mb-3">
                        <div class="col-12 d-flex align-items-center">
                            <h4 class="mb-0">Stripe Checkout</h4>
                            <div style="flex-grow: 1; height: 1px; background-color: #ccc; margin-left: 10px;"></div>
                        </div>
                    </div>
                    


                        <div id="stripe-checkout-element"></div>

                        <form id="payment-form">
                            <div id="payment-element">
                                <!-- Stripe.js injects the Payment Element here -->
                            </div>
                            <button class="btn btn-primary mt-3" id="submit">Pay</button>
                            <div id="error-message"></div>
                        </form>
                    </div>
                </div>
            </div>

        </div>
    </div>




    <?php
    return ob_get_clean();
}
add_shortcode('multistep_form', 'multistep_form_shortcode');
