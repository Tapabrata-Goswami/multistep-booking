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
    // Enqueue Font Awesome
    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
    // wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css');

    wp_enqueue_style('multistep-form-style', plugins_url('style.css', __FILE__));
    wp_enqueue_script('multistep-form-script', plugins_url('script.js', __FILE__), array('jquery'), null, true);
}
add_action('wp_enqueue_scripts', 'multistep_form_enqueue_bootstrap');
add_action('wp_enqueue_scripts', 'multistep_form_enqueue_bootstrap');


require_once 'vendor/autoload.php';

// Enqueue scripts
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

// Create Payment Intent via AJAX
function create_payment_intent() {
    \Stripe\Stripe::setApiKey('sk_test_tR3PYbcVNZZ796tH88S4VQ2u'); // Use your Stripe secret key

    // Capture incoming POST data
    $input = file_get_contents('php://input');
    $body = json_decode($input, true);

    // Extract data from the body
    $customer_name = sanitize_text_field($body['generalDetails']['phone']);
    $total_cost = $body['totalCost'] * 100;
    $travelers = isset($body['travelers']) ? $body['travelers'] : [];

    $customer_address = [
        'line1' => '1234 Elm Street',
        'postal_code' => '123456',
        'city' => 'Springfield',
        'state' => 'IL',
        'country' => 'US'
    ];

    $email = sanitize_email($body['generalDetails']['email']);
    if (!is_email($email)) {
        wp_send_json_error(['message' => 'Invalid email address.']);
        return;
    }

    // Create the Payment Intent
    try {
        $paymentIntent = \Stripe\PaymentIntent::create([
            'amount' => $total_cost, // Convert to cents
        //   'amount' => 50,
            'currency' => 'usd',
            'description' => 'Payment for travelers booking',
            'metadata' => [
                'customer_name' => $customer_name,
                'customer_address' => json_encode($customer_address), // Store address as JSON
            ],
            'shipping' => [
                'name' => $customer_name,
                'address' => [
                    'line1' => $customer_address['line1'],
                    'postal_code' => $customer_address['postal_code'],
                    'city' => isset($customer_address['city']) ? $customer_address['city'] : '',
                    'state' => isset($customer_address['state']) ? $customer_address['state'] : '',
                    'country' => $customer_address['country'],
                ],
            ],
        ]);

        wp_send_json_success(['clientSecret' => $paymentIntent->client_secret]);
        
    } catch (\Stripe\Exception\ApiErrorException $e) {
        wp_send_json_error(['message' => 'Stripe error: ' . $e->getMessage()]);
        return;
    } catch (Exception $e) {
        wp_send_json_error(['message' => 'General error: ' . $e->getMessage()]);
        return;
    }

    wp_die(); 
}
add_action('wp_ajax_create_payment_intent', 'create_payment_intent');
add_action('wp_ajax_nopriv_create_payment_intent', 'create_payment_intent');


add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/send-booking-email', array(
        'methods' => 'POST',
        'callback' => 'send_booking_confirmation_email',
        'permission_callback' => '__return_true' // Adjust this as needed for security
    ));
});


function save_image_from_base64($base64_img, $file_name) {
    $upload_dir = wp_upload_dir();
    $img_data = explode(',', $base64_img);
    $decoded_image = base64_decode($img_data[1]);
    $file = $upload_dir['path'] . '/' . $file_name;
    
    file_put_contents($file, $decoded_image);

    $file_url = $upload_dir['url'] . '/' . $file_name;
    return $file_url;
}


function send_booking_confirmation_email($request) {

    $params = $request->get_json_params();
    
    $paymentIntent = $params['paymentIntent'];
    $total_cost = $params['totalCost'] * 100;
    $travelers = isset($params['travelers']) ? $params['travelers'] : [];
    $email = $params['generalDetails']['email'];

    $subject = "Payment Successful - Booking Confirmation";

    // Start email message body
    $message = "
            <html>
            <head>
              <title>Booking Confirmation</title>
              <style>
                body { font-family: Arial, sans-serif; color: #333; }
                .container { width: 100%; max-width: 600px; margin: auto; }
                .header { background-color: #4CAF50; color: white; padding: 10px 0; text-align: center; }
                .content { padding: 20px; }
                .details, .travelers { margin-bottom: 20px; }
                .details h2, .travelers h2 { border-bottom: 2px solid #4CAF50; padding-bottom: 5px; }
                .details p, .travelers p { line-height: 1.6; }
                .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; }
                .image { height: 150px; width: 150px; object-fit: contain; }
              </style>
            </head>
            <body>
              <div class='container'>
                <div class='header'>
                  <h1>Payment Successful</h1>
                </div>
                <div class='content'>
                  <p>Dear Traveler,</p>
                  <p>Thank you for your payment! We are pleased to confirm your booking.</p>
            
                  <div class='details'>
                    <h2>Booking Details</h2>
                    <p><strong>Transaction ID:</strong> " . esc_html($paymentIntent) . "</p>
                    <p><strong>Total Cost:</strong> $" . number_format($total_cost / 100, 2) . "</p>
                    <p><strong>Email:</strong> " . esc_html($email) . "</p>
                    <p><strong>Phone:</strong> " . esc_html($params['generalDetails']['phone']) . "</p>
                    <p><strong>Arrival Date:</strong> " . esc_html($params['generalDetails']['arrivalDate']) . "</p>
                  </div>
            
                  <div class='travelers'>
                    <h2>Traveler Details</h2>";

                    // Loop through travelers and add their details to the email
                    foreach ($travelers as $index => $traveler) {
                        $photo_url = save_image_from_base64($traveler['photoFile'], "traveler_photo_{$index}.jpg");
                        $passport_url = save_image_from_base64($traveler['passportFile'], "traveler_passport_{$index}.jpg");
                        $message .= "
                        <p><strong>Traveler " . ($index + 1) . ":</strong></p>
                        <p>Name: " . esc_html($traveler['firstName']) . " " . esc_html($traveler['lastName']) . "</p>
                        <p>Date of Birth: " . esc_html($traveler['dob']) . "</p>
                        <p>Gender: " . esc_html($traveler['gender']) . "</p>
                        <img class='image' src='" . esc_url($photo_url) . "' alt='Traveler Photo'>
                        <img class='image' src='" . esc_url($passport_url) . "' alt='Traveler Passport'>";
                    }
            
                  $message .= "
                  </div>
                </div>
                <div class='footer'>
                  <p>If you have any questions, feel free to contact our support team.</p>
                  <p>&copy; " . date('Y') . " ExpressETA. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            ";
    
    $tfname = $travelers[0]['firstName'];
    
    
    $message2 = "
            <html>
            <head>
              <title>Kenya eTA Booking Confirmation</title>
              <style>
                 body { font-family: Arial, sans-serif; color: #333; }
                .container { width: 100%; max-width: 600px; margin: auto; }
                .header { background-color: #4CAF50; color: white; padding: 10px 0; text-align: center; }
                .details, .travelers { margin-bottom: 20px; }
                .details h2, .travelers h2 { border-bottom: 2px solid #4CAF50; padding-bottom: 5px; }
                .details p, .travelers p { line-height: 1.6; }
                .content { padding: 20px; }
                .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; }
                .image { height: 150px; width: 150px; object-fit: contain; }
              </style>
            </head>
            <body>
              <div class='container'>
                <div class='header'>
                  <h1>Kenya eTA Application - Payment Successful</h1>
                </div>
                <div class='content'>
                  <p>Dear " . esc_html($tfname) . ",</p>
                  <p>Thank you for choosing our service to process your Kenya eTA. We are pleased to confirm that your payment has been successfully received, and your visa application is now in progress.</p>
            
                <div class='details'>
                    <h2>Booking Details</h2>
                    <p><strong>Total Cost:</strong> $" . number_format($total_cost / 100, 2) . "</p>
                    <p><strong>Email:</strong> " . esc_html($email) . "</p>
                    <p><strong>Phone:</strong> " . esc_html($params['generalDetails']['phone']) . "</p>
                    <p><strong>Arrival Date:</strong> " . esc_html($params['generalDetails']['arrivalDate']) . "</p>
                  </div>
                  
                  <div class='travelers'>
                    <h2>Traveler Details</h2>";

                    // Loop through travelers and add their details to the email
                    foreach ($travelers as $index => $traveler) {
                        $photo_url = save_image_from_base64($traveler['photoFile'], "traveler_photo_{$index}.jpg");
                        $passport_url = save_image_from_base64($traveler['passportFile'], "traveler_passport_{$index}.jpg");
                        $message2 .= "
                        <p><strong>Traveler " . ($index + 1) . ":</strong></p>
                        <p>Name: " . esc_html($traveler['firstName']) . " " . esc_html($traveler['lastName']) . "</p>
                        <p>Date of Birth: " . esc_html($traveler['dob']) . "</p>
                        <p>Gender: " . esc_html($traveler['gender']) . "</p>
                        <img class='image' src='" . esc_url($photo_url) . "' alt='Traveler Photo'>
                        <img class='image' src='" . esc_url($passport_url) . "' alt='Traveler Passport'>";
                    }
            
                  $message2 .= "
                  </div>
                  
                  <p><strong>Transaction ID:</strong> " . esc_html($paymentIntent) . "</p>
                  <p><strong>Application Status:</strong> Processing</p>
            
                  <p>While we process your application, feel free to explore our <a href='https://expresseta.com/blog/'>blog</a>, where you'll find tips on what to expect in Kenya, travel recommendations, and more insights to help make your journey unforgettable.</p>
            
                  <p>You will receive another email with your eTA once it has been approved and is ready for download.</p>
            
                  <p>Should you have any questions or require further assistance, please feel free to reach out to us at <a href='mailto:support@expresseta.com'>support@expresseta.com</a>.</p>
            
                  <p>Thank you for entrusting us with your travel needs. We look forward to assisting you and wish you a smooth journey to Kenya.</p>
                  <p>Warm regards,</p>
                  <p ><strong>Your ExpressETA Team</strong></p>
                </div>
                <div class='footer'>
                   <p>If you have any questions, feel free to contact our support team.</p>
                  <p>&copy; " . date('Y') . " ExpressETA. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            ";
            
            $headers = array('Content-Type: text/html; charset=UTF-8');

    if (wp_mail("support@expresseta.com", $subject, $message,$headers) && wp_mail($email, $subject, $message2,$headers)) {
        return new WP_REST_Response(['success' => true, 'message' => 'Successfully mail sent'], 200);
    } else {
        return new WP_REST_Response(['success' => false, 'message' => 'Failed to mail sent'], 500);
    }
}





// Shortcode to display the form
function multistep_form_shortcode() {
    ob_start();
    ?>
    <!-- Multi Step form start-->
    <div class="container-fluid main-form-container" style="margin-top:-40px">
        <div class="container">
                <div>
                    <h4 class="mb-0 main-heading-form">Your personal details</h4>
                </div>
                <div>
                    <p class="">These should match what's in your passport</p>
                </div>
                <hr class="m-0 p-0">
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
                                    <label for="">First and middle name</label>
                                    <input type="text" class="form-control" placeholder="First and middle name" name="first-name" id="">
                                    <div class="invalid-feedback">
                                        <div class="d-flex justify-content-start">
                                        First name is required.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="">Last Name</label>
                                    <input type="text" class="form-control" placeholder="Last Name" name="last-name" id="">
                                    <div class="invalid-feedback">
                                        <div class="d-flex justify-content-start">Last name is required.</div>
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                        <div class="row mt-3">
                            <div class="col-md-6">
                                <div class="row">
                                    <label class="dateoB" for="">Date of Birth</label>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                        <select id="dob-day" class="form-control dobdata">
                                            <option value="">Day</option>
                                            <!-- Generate day options -->
                                            <script>
                                                for (let i = 1; i <= 31; i++) {
                                                    document.write('<option value="' + i + '">' + i + '</option>');
                                                }
                                            </script>
                                        </select>
                                        <div class="invalid-feedback">
                                            <div class="d-flex justify-content-start">Day is Required.</div>
                                        </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <select id="dob-month" class="form-control dobdata">
                                                <option value="">Month</option>
                                                <option value="January">January</option>
                                                <option value="February">February</option>
                                                <option value="March">March</option>
                                                <option value="April">April</option>
                                                <option value="may">May</option>
                                                <option value="June">June</option>
                                                <option value="July">July</option>
                                                <option value="August">August</option>
                                                <option value="September">September</option>
                                                <option value="October">October</option>
                                                <option value="November">November</option>
                                                <option value="December">December</option>
                                            </select>
                                            <div class="invalid-feedback">
                                            <div class="d-flex justify-content-start">Month is Required.</div>
                                        </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-group">
                                            <select id="dob-year" class="form-control dobdata">
                                                <option value="">Year</option>
                                                <!-- Generate year options -->
                                                <script>
                                                    const today = new Date();
                                                    const currentYear = today.getFullYear();
                                                    for (let i = currentYear; i >= 1900; i--) {
                                                        document.write('<option value="' + i + '">' + i + '</option>');
                                                    }
                                                </script>
                                            </select>
                                            <div class="invalid-feedback">
                                            <div class="d-flex justify-content-start">Year is Required.</div>
                                        </div>
                                        </div>
                                    </div>
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
                                    <div class="invalid-feedback">
                                        <div class="d-flex justify-content-start">
                                            Gender is required.
                                        </div>
                                    </div>
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
                                        <div class="invalid-feedback">
                                            <div class="d-flex justify-content-start">
                                                Passport image is required and must be an image file.
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="photo">Upload photo (51mm by 51mm)</label>
                                    <div class="custom-file">
                                        <input type="file" class="custom-file-input" id="photo" onchange="showFileName(this)" name="photo">
                                        <label class="custom-file-label" for="photo">Choose file</label>
                                        
                                        <div class="invalid-feedback">
                                            <div class="d-flex justify-content-start">
                                                Photo is required and must be an image file.
                                            </div>
                                        </div>
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
                             Add Traveler
                        </button>
                    </div>
                </div>
                <div class="row pt-5">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="">Phone</label>
                            <input type="tel" placeholder="Enter your phone number" class="form-control" name="phone" id="">
                            <div class="invalid-feedback">
                                <div class="d-flex justify-content-start">
                                Phone number is required.
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="">Date of Arrival</label>
                            <input type="text" class="form-control" placeholder="Date of Arrival" name="arrival" id="arrival" data-toggle="flatpickr">
                            <div class="invalid-feedback">
                                <div class="d-flex justify-content-start">
                                Please select a date of arrival.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
                <div class="row">
                        <div class="col-md-6">
                            <label for=""></label>
                            <div class="form-group">
                                <label for="">Email</label>
                                <input type="email" placeholder="Enter your email address" class="form-control" name="email" id="">
                                <div class="invalid-feedback">
                                    <div class="d-flex justify-content-start">
                                    Valid email is required.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label for=""></label>
                            <div class="form-group">
                                <label for="">Confirm Email</label>
                                <input type="email" placeholder="Enter your email address" class="form-control" name="conemail" id="">
                                <div class="invalid-feedback">
                                    <div class="d-flex justify-content-start">
                                    Email addresses must match.
                                    </div>
                                </div>
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

    <div class="container-fluid" style="margin-top:-40px">
        <div id="submitted-details" class="container" style="display:none">
            
            <div class="row gap-">
                
                <div class="col-md-6">
                    <h3>Traveler Details</h3>
                    <div id="traveler-details-list" >

                    </div>
                </div>
                <div class="col-md-6 sticky-part">
                    <!--<h3>Please choose the Service you require<span style="color:red;">*</span></h3>-->
                    <div class="row">
                        <div class="col-md-12">
                            <h5 class="h4">Please choose the service you require<span style="color:red;">*</span></h5>
                            <div class="form-group mt-3 py-3">
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
                    

                    <div id="loading-icon" style="display:none; text-align: center;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i>
                        <p>Please wait...</p>
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


    <?php
    return ob_get_clean();
}
add_shortcode('multistep_form', 'multistep_form_shortcode');
