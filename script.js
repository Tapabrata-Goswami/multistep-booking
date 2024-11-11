jQuery(document).ready(function($) {
    var travelerCount = 1; 
    var maxTravelers = 5;

    // initializeFlatpickr($('.dobdata'));
    initializeFlatpickr($('#arrival'));
    // initializeDOB();

    $('#add-traveler-btn').on('click', function(e) {
        e.preventDefault();

        if (travelerCount < maxTravelers) {
            var clonedCard = $('.traveler-card:first').clone();

            travelerCount++;

            // clonedCard.find('.card-header h4').text('Traveler ' + travelerCount);
            clonedCard.find('.card-header h4').html(`
                <div class="d-flex justify-content-between align-items-center">
                    <span>Traveler ${travelerCount}</span>
                    <button type="button" class="btn btn-outline-danger remove-traveler-btn">Remove</button>
                </div>
            `);

            clonedCard.find('input, select, textarea').each(function() {
                var type = $(this).attr('type');

                if (type === 'text' || type === 'email' || type === 'tel' || type === 'date') {
                    $(this).val('');
                } else if (type === 'file') {
                    $(this).val(''); 
                    $(this).next('.custom-file-label').text('Choose file'); 
                } else if ($(this).is('select')) {
                    $(this).val(''); 
                }
            });
            var newId = "";

            clonedCard.find('input[data-toggle="flatpickr"]').each(function() {

                if (this._flatpickr) {
                    this._flatpickr.destroy();
                }

                $(this).siblings('.flatpickr-input').remove();
                $(this).siblings('.flatpickr-alt-input').remove();

                $(this).val('');

                var originalId = $(this).attr('id');
                newId = originalId + '-' + travelerCount;
                $(this).attr('id', newId);

                initializeFlatpickr($(this));

            });

            clonedCard.find('input[type="file"]').each(function() {
                var originalId = $(this).attr('id');
                var newId = originalId + '-' + travelerCount; 
                $(this).attr('id', newId); 
                
                $(this).next('label.custom-file-label').attr('for', newId).text("Choose file");
            });

            // clonedCard.append('<button type="button" class="btn btn-outline-danger remove-traveler-btn mt-2">Remove Traveler</button>');

            clonedCard.insertBefore('#add-traveler-btn').hide().fadeIn();

            clonedCard.find('.remove-traveler-btn').on('click', function() {
                $(this).closest('.traveler-card').fadeOut(function() {
                    $(this).remove(); // Remove the card
                    travelerCount--; // Decrement traveler count
                });
            });

        } else {
            alert('You can only add up to ' + maxTravelers + ' travelers.');
        }
    });

    window.showFileName = function(input) {

        if(validateImage(input)){
            var fileName = input.files.length > 0 ? input.files[0].name : "Choose file";
            $(input).next('.custom-file-label').text(fileName);
        }

    };




    function initializeFlatpickr(element) {
        // console.log(element);
        // var $element = $(element);
        // if($element.is("#arrival")){
            element.flatpickr({
                dateFormat: 'd/m/Y',
                altInput: true,
                altFormat: 'd/m/Y',
                allowInput: true,
                minDate: 'today',  // Restrict to today and future dates
                onChange: function(selectedDates, dateStr) {
                    handleServiceSelection(dateStr);
                }
            });
        // }else{
        //     element.flatpickr({
        //         dateFormat: 'd/m/Y',
        //         altInput: true,
        //         altFormat: 'd/m/Y',
        //         allowInput: true
        //     });
        // }

    }

    var timeDiff=0;

    function handleServiceSelection(arrivalDateStr) {
        var selectedDate = new Date(arrivalDateStr.split('/').reverse().join('-'));
        var today = new Date();
        timeDiff = Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24)); // Difference in days
    
        $('input[name="service"]').prop('disabled', false); // Enable all options
        $('#priorityService').prop('checked', false); // Reset priority service selection
    
        if (timeDiff < 5) { // If selected date is less than 4 days away (i.e., today or 1, 2, 3 days)
            $('#priorityService').prop('checked', true); // Force priority service selection
            $('input[name="service"]').not('#priorityService').prop('disabled', true); // Disable other options
        } else if (timeDiff >= 5) { // If selected date is 4 days or more
            $('input[name="service"]').prop('disabled', false); // Enable all options
            // Check if priority service is not already selected
            if (!$('input[name="service"]:checked').length) {
                $('#priorityService').prop('checked', false); // Ensure priority service is not selected
            }
        } else {
            // If the selected date is before today or invalid, reset everything
            $('input[name="service"]').prop('disabled', true); // Disable all options
        }
    }

    function validateImage(input) {
        const filePath = input.value;
        const allowedExtensions = /(.jpg|.jpeg|.png|.gif)$/i; // Allowed image extensions
    
        if (!allowedExtensions.exec(filePath)) {
            alert('Please upload an image file (JPG, JPEG, PNG, GIF).');
            input.value = '';
            return false; // Clear the input
            input.nextElementSibling.innerHTML = 'Choose file'; // Reset label
        } else {
            return true;
        }
    }


    $('#next').on('click', function(e) {
        e.preventDefault();

        $('#traveler-details-list').html('');
        var travelerData = [];
        var hasIncompleteInfo = false; 
        var travelerCount = 0;
        function readFileAsBase64(file) {
            return new Promise(function(resolve, reject) {
                if (file) {
                    var reader = new FileReader();
                    reader.onloadend = function() {
                        resolve(reader.result); 
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                } else {
                    resolve(null); 
                }
            });
        }

        // Process each traveler
        var travelerPromises = $('.traveler-card').map(function(index, element) {
            var firstName = $(this).find('input[name="first-name"]').val();
            var lastName = $(this).find('input[name="last-name"]').val();
            // var dob = $(this).find('input[name="dob"]').val();
            var dobday = $(this).find('#dob-day').val();
            var dobmonth = $(this).find('#dob-month').val();
            var dobyear = $(this).find('#dob-year').val();

            var gender = $(this).find('select[name="gender"]').val();
            
            // Fetch file inputs
            var passportFile = $(this).find('input[name="passport"]')[0].files[0];
            // console.log(passportFile);
            var photoFile = $(this).find('input[name="photo"]')[0].files[0];

            if (!firstName) {
                $(this).find('input[name="first-name"]').next('.invalid-feedback').show();
                hidemessage();
                hasIncompleteInfo = true;
            }
            if (!lastName) {
                $(this).find('input[name="last-name"]').next('.invalid-feedback').show();
                hidemessage();
                hasIncompleteInfo = true;
            }
            if(!dobday){
                $(this).find('#dob-day').next('.invalid-feedback').show();
                hidemessage();
                hasIncompleteInfo = true;
            }
            if(!dobmonth){
                $(this).find('#dob-month').next('.invalid-feedback').show();
                hidemessage();
                hasIncompleteInfo = true;
            }
            if(!dobyear){
                $(this).find('#dob-year').next('.invalid-feedback').show();
                hidemessage();
                hasIncompleteInfo = true;
            }
            // if (!dob || dob === undefined) {
            //     $(this).find('input[type="text"][placeholder="Date of Birth"]').next('.invalid-feedback').show();
            //     hidemessage();
            //     hasIncompleteInfo = true;
            // }
            if (!gender) {
                $(this).find('select[name="gender"]').next('.invalid-feedback').show();
                hidemessage();
                hasIncompleteInfo = true;
            }
    
            // Validate passport file (must be an image)
            if (!passportFile || !passportFile.type.startsWith('image/')) {
                $(this).find('input[name="passport"]').next('label').next('.invalid-feedback').show();
                hidemessage();
                hasIncompleteInfo = true;
            }
    
            // Validate photo file (must be an image)
            if (!photoFile || !photoFile.type.startsWith('image/')) {
                $(this).find('input[name="photo"]').next('label').next('.invalid-feedback').show();
                hidemessage();
                hasIncompleteInfo = true;
            }

            travelerCount++;

            return Promise.all([
                readFileAsBase64(passportFile),
                readFileAsBase64(photoFile)
            ]).then(function(results) {
                var passportBase64 = results[0];
                var photoBase64 = results[1];

                travelerData.push({
                    firstName: firstName,
                    lastName: lastName,
                    dob: `${dobday}-${dobmonth}-${dobyear}`,
                    gender: gender,
                    passportFile: passportBase64,
                    photoFile: photoBase64
                });

                var summaryHtml = `
                    <div class="card mt-3">
                        <div class="card-header">
                            <h4 class="h5 m-0">Traveler ${index + 1}</h4>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <span class = "stng">First Name:</span> ${firstName}
                                </div>
                                <div class="col-md-6">
                                    <span class = "stng">Last Name:</span> ${lastName}
                                </div>
                            </div>
                            <hr style="margin:10px;">
                            <div class="row">
                                <div class="col-md-6">
                                    <span class = "stng">Date of Birth:</span> ${dobday} ${dobmonth}, ${dobyear}
                                </div>
                                <div class="col-md-6">
                                    <span class = "stng">Gender:</span> <span style="text-transform: capitalize;">${gender}</span>
                                </div>
                            </div>
                            <hr style="margin:10px;">
                            <div class="row">
                                <div class="col-md-6">
                                    <span class = "stng">Passport File:</span><br>
                            ${passportBase64 ? `<img src="${passportBase64}" alt="Passport" width="100">` : 'No file uploaded'}
                                </div>
                                <div class="col-md-6">
                                   <span class = "stng">Photo File:</span><br>
                            ${photoBase64 ? `<img src="${photoBase64}" alt="Photo" width="100">` : 'No file uploaded'}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                $('#traveler-details-list').append(summaryHtml);
            });
        }).get();

        // if (hasIncompleteInfo) return; // Stop if any info was incomplete

        // Wait for all traveler processing to finish
        Promise.all(travelerPromises).then(function() {
            // Collect general details outside the traveler cards (phone, email, arrival date)
            var phone = $('input[name="phone"]').val();
            var email = $('input[name="email"]').val();
            var confirmEmail = $('input[name="conemail"]').val();
            var arrivalDate = $('#arrival').val();
            var hasError = false;

            // Phone validation
            if (!phone || !/^\+?[0-9]{1,4}?[-.\s]?[0-9]{10}$/.test(phone)) {
                $('input[name="phone"]').addClass('is-invalid');
                $('input[name="phone"]').next('.invalid-feedback').text('Please enter a valid 10-digit phone number.').show();
                hidemessage();
                hasError = true;
            } else {
                $('input[name="phone"]').removeClass('is-invalid');
                $('input[name="phone"]').next('.invalid-feedback').hide();
            }

            // Email validation
            if (!email || email ==" " || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                console.log(email);
                $('input[name="email"]').addClass('is-invalid');
                $('input[name="email"]').next('.invalid-feedback').text('Please enter a valid email address.').show();
                hidemessage();
                hasError = true;
            } else {
                $('input[name="email"]').removeClass('is-invalid');
                $('input[name="email"]').next('.invalid-feedback').hide();
            }

            // Confirm email validation
            if (email !== confirmEmail) {
                $('input[name="email"]').last().addClass('is-invalid');
                $('input[name="email"]').last().next('.invalid-feedback').text('The email addresses do not match.').show();
                hidemessage();
                hasError = true;
            } else {
                $('input[name="email"]').last().removeClass('is-invalid');
                $('input[name="email"]').last().next('.invalid-feedback').hide();
            }

            // Date of arrival validation
            if (!arrivalDate) {
                $('input[type="text"][placeholder="Date of Arrival"]').addClass('is-invalid');
                $('input[type="text"][placeholder="Date of Arrival"]').next('.invalid-feedback').text('Please select a date of arrival.').show();
                hidemessage();
                hasError = true;
            } else {
                $('#arrival').removeClass('is-invalid');
                $('#arrival').next('.invalid-feedback').hide();
            }

            // If there is any error, stop processing
            if (hasError) {
                return;
            }
            if (hasIncompleteInfo) return;

            var generalDetails = {
                phone: phone,
                email: email,
                arrivalDate: arrivalDate
            };

            var formData = {
                generalDetails: generalDetails,
                travelers: travelerData
            };

            localStorage.setItem('formData', JSON.stringify(formData));
            localStorage.setItem('nextStep',true);
            // Append general details and total cost to the summary
            var generalDetailsHtml = `
                <div class="card mt-3">
                    <div class="card-header">
                        <h4 class="h5 m-0">General Details</h4>
                    </div>
                    <div class="card-body p-3">
                        <div class="row">
                            <div class="col-md-6">
                                <span class ="stng">Phone </span>
                            </div>
                            <div class="col-md-6">
                                ${phone}
                            </div>
                        </div>
                        <hr style="margin:10px;">
                        <div class="row">
                            <div class="col-md-6">
                               <span class = "stng"> Email </span>
                            </div>
                            <div class="col-md-6">
                            ${email}
                            </div>
                        </div>
                        <hr style="margin:10px;">
                    
                        <div class="row">
                            <div class="col-md-6">
                               <span class = "stng"> Arrival date </span>
                            </div>
                            <div class="col-md-6">
                            ${arrivalDate}
                            </div>
                        </div>
                    
                    </div>
                </div>
            `;
            $('#traveler-details-list').append(generalDetailsHtml);

            // Hide the form and show the details section
            $('.main-form-container').hide();
            $('#submitted-details').show();

            // Check if the back button already exists, if not, create it
            if ($('#back-to-form-btn').length === 0) {
                var backButton = `<button id="back-to-form-btn" class="btn btn-lg btn-primary mt-4 px-5">
     Back</button>`;
                $('#traveler-details-list').append(backButton);

                // Handle the "Back to Form" button click
                $('#back-to-form-btn').on('click', function() {
                    $('#submitted-details').hide(); // Hide the details section
                    $('.main-form-container').show(); // Show the form again
                    $('#traveler-details-list').html(''); // Clear the traveler details
                });
            }
        });

        
        let serviceCost = 0;
        $('input[name="service"]').prop('checked', false); // Uncheck all options
        if(timeDiff < 5){
            $('#priorityService').prop('checked', true);
            serviceCost = 100;
        }else if (timeDiff >= 5){
            $('#standardService').prop('checked', true);
            serviceCost = 60;
        }
         // Set the standard service (60 dollars) as checked

        // Calculate the total cost with standard service (60 dollars)
         // Get the value from the checked radio
        let totalCost = serviceCost * travelerCount;
        
        if(timeDiff < 5){
            $('.table-of-total tbody').html(`
                <tr>
                    <td>${$('#priorityService').next().text()}</td>
                    <td>${travelerCount}</td>
                    <td>$${totalCost.toFixed(2)}</td>
                </tr>
            `);
        }else if(timeDiff >= 5){
            $('.table-of-total tbody').html(`
                <tr>
                    <td class = "lh-2">${$('#standardService').next().text()}</td>
                    <td>${travelerCount}</td>
                    <td>$${totalCost.toFixed(2)}</td>
                </tr>
            `);
        }

        let dataToStore = {
            totalCost: totalCost.toFixed(2),
            travelerQnty: travelerCount
        };

        localStorage.setItem('costDetails', JSON.stringify(dataToStore));
        
        // Display the total cost in the table

        $('.table-of-total tfoot th:nth-child(3)').text(`$${totalCost.toFixed(2)}`);
        

    });

    $('input[name="service"]').on('change', function() {

        let serviceCost = $('input[name="service"]:checked').val(); // Get the value from the checked radio
        let totalCost = serviceCost * travelerCount;

        // Update the total cost in the table
        $('.table-of-total tbody').html(`
            <tr>
                <td>${$('input[name="service"]:checked').next().text()}</td>
                <td>${travelerCount}</td>
                <td>$${totalCost.toFixed(2)}</td>
            </tr>
        `);
        $('.table-of-total tfoot th:nth-child(3)').text(`$${totalCost.toFixed(2)}`);
        
        let dataToStore = {
            totalCost: totalCost,
            travelerQnty: travelerCount
        };

        localStorage.setItem('costDetails', JSON.stringify(dataToStore));
    });

    function hidemessage(){
        setTimeout(function() {
            // emailInput.;
            $('.invalid-feedback').hide();
        }, 2000);
    }
});


jQuery(document).ready(function ($) {


    // Function to get URL parameters
    function getUrlParameters() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');

        pairs.forEach(function (pair) {
            const [key, value] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value);
        });

        return params;
    }

    // Get URL parameters
    const urlParams = getUrlParameters();

    // Check for payment_intent and redirect_status
    const paymentIntent = urlParams.payment_intent;
    const paymentIntentClientSecret = urlParams.payment_intent_client_secret;
    const redirectStatus = urlParams.redirect_status;

    if (redirectStatus === 'succeeded') {
        $(".main-form-container").css("display", "none");
        // Payment was successful, show the thank you message
        $("body").html(`
            <div style="text-align: center; margin-top: 50px;">
                <h3>Thank you for your payment!</h3>
                <p>Your Kenya eTA is now being processed, and a confirmation email has been sent to you.</p>
                <button id="back-button" class="btn btn-primary" ">Back</button>
            </div>
        `);
            // Clear the URL and go back when the back button is clicked
        $("#back-button").on("click", function() {
            window.history.replaceState({}, document.title, window.location.pathname);
            // Optionally, redirect to the main page or wherever you want
            window.location.href = 'https://expresseta.com/application-form/'; // Change '/' to your desired URL
        });
        
        
        var costDetails = JSON.parse(localStorage.getItem('costDetails'));
        var formData = JSON.parse(localStorage.getItem('formData'));
        
        if (costDetails && formData) {
            dataFetched = true; 
        
            // Extract values
            var totalCost = costDetails.totalCost; // Already in cents
            var travelerQnty = costDetails.travelerQnty; // Ensure this value is needed
            var generalDetails = formData.generalDetails;
            var travelers = formData.travelers;
        
            fetch('https://expresseta.com/wp-json/custom/v1/send-booking-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymentIntent: paymentIntent,
                    totalCost: totalCost,
                    travelerQnty: travelerQnty, // Include if needed
                    generalDetails: generalDetails,
                    travelers: travelers
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    console.log(data);
                } else {
                    console.error(data);
                }
            })
            .catch(error => console.error('Error:', error));
        }

        
        
    }
});


jQuery(document).ready(function ($) {
    $("#next").on("click", function (event) {
        event.preventDefault(); // Prevent the default form submission
        
        // Show the loading icon
        $("#loading-icon").show();
        $("#submit").prop("disabled", true); // Disable the submit button

        // Simulate a delay of 4 seconds (4000 milliseconds)
        setTimeout(function () {
            // You can place your payment processing code here
            // Hide the loading icon after 4 seconds
            $("#loading-icon").hide();
            $("#submit").prop("disabled", false); // Re-enable the submit button
        }, 6000);

        // You would typically call your Stripe payment processing here
        // Example: stripe.confirmPayment({...}).then(...);
    });
});


jQuery(document).ready(function($){
    $("#yoast-breadcrumbs").addClass('container');
    $("#yoast-breadcrumbs span:first").css("margin-left","11px");
});

