jQuery(document).ready(function($) {
    var travelerCount = 1; 
    var maxTravelers = 5;

    initializeFlatpickr($('#dob'));
    initializeFlatpickr($('#arrival'));

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
        var fileName = input.files.length > 0 ? input.files[0].name : "Choose file";
        $(input).next('.custom-file-label').text(fileName);
    };

    function initializeFlatpickr(element) {
        element.flatpickr({
            dateFormat: 'd/m/Y',  // Date format in input field
            altInput: true,
            altFormat: 'd/m/Y',  // Display format
            allowInput: true
        });
    }


    $('#next').on('click', function(e) {
        e.preventDefault();

        // Clear previous details
        $('#traveler-details-list').html('');

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
            var dob = $(this).find('input[name="dob"]').val();
            var gender = $(this).find('select[name="gender"]').val();
            
            // Fetch file inputs
            var passportFile = $(this).find('input[name="passport"]')[0].files[0];
            console.log(passportFile);
            var photoFile = $(this).find('input[name="photo"]')[0].files[0];

            if (!firstName) {
                $(this).find('input[name="first-name"]').next('.invalid-feedback').show();
                hasIncompleteInfo = true;
            }
            if (!lastName) {
                $(this).find('input[name="last-name"]').next('.invalid-feedback').show();
                hasIncompleteInfo = true;
            }
            if (!dob || dob === undefined) {
                $(this).find('input[type="text"][placeholder="Date of Birth"]').next('.invalid-feedback').show();
                hasIncompleteInfo = true;
            }
            if (!gender) {
                $(this).find('select[name="gender"]').next('.invalid-feedback').show();
                hasIncompleteInfo = true;
            }
    
            // Validate passport file (must be an image)
            if (!passportFile || !passportFile.type.startsWith('image/')) {
                $(this).find('input[name="passport"]').next('label').next('.invalid-feedback').show();
                hasIncompleteInfo = true;
            }
    
            // Validate photo file (must be an image)
            if (!photoFile || !photoFile.type.startsWith('image/')) {
                $(this).find('input[name="photo"]').next('label').next('.invalid-feedback').show();
                hasIncompleteInfo = true;
            }

            // Skip any traveler card with incomplete information
            // if (!firstName || !lastName || !dob || !gender) {
            //     alert('Please fill out all fields for traveler ' + (index + 1));
            //     hasIncompleteInfo = true;
            //     return false; // Stop processing if incomplete
            // }

            travelerCount++;

            return Promise.all([
                readFileAsBase64(passportFile),
                readFileAsBase64(photoFile)
            ]).then(function(results) {
                var passportBase64 = results[0];
                var photoBase64 = results[1];

                var summaryHtml = `
                    <div class="card mt-3">
                        <div class="card-header">
                            <h4 class="h5">Traveler ${index + 1}</h4>
                        </div>
                        <div class="card-body">
                            <p><strong>First Name:</strong> ${firstName}</p>
                            <hr>
                            <p><strong>Last Name:</strong> ${lastName}</p>
                            <p><strong>Date of Birth:</strong> ${dob}</p>
                            <p><strong>Gender:</strong> ${gender}</p>
                            <p><strong>Passport File:</strong><br>
                            ${passportBase64 ? `<img src="${passportBase64}" alt="Passport" width="100">` : 'No file uploaded'}</p>
                            <p><strong>Photo File:</strong><br>
                            ${photoBase64 ? `<img src="${photoBase64}" alt="Photo" width="100">` : 'No file uploaded'}</p>
                        </div>
                    </div>
                `;
                $('#traveler-details-list').append(summaryHtml);
            });
        }).get();

        if (hasIncompleteInfo) return; // Stop if any info was incomplete

        // Wait for all traveler processing to finish
        Promise.all(travelerPromises).then(function() {
            // Collect general details outside the traveler cards (phone, email, arrival date)
            var phone = $('input[name="phone"]').val();
            var email = $('input[name="email"]').val();
            var arrivalDate = $('#arrival').val();

            if (!phone || !email || !arrivalDate) {
                alert('Please fill in all general details.');
                return;
            }

            // Calculate total cost
            // var totalCost = travelerCount * costPerTraveler;

            // Append general details and total cost to the summary
            var generalDetailsHtml = `
                <div class="card mt-3">
                    <div class="card-header">
                        <h4 class="h5">General Details</h4>
                    </div>
                    <div class="card-body">
                        
                        <p class="p"><strong>Phone:</strong> ${phone}</p>
                        <hr>
                        <p><strong>Email:</strong> ${email}</p>
                        <hr>
                        <p><strong>Date of Arrival:</strong> ${arrivalDate}</p>
                        
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
    <i class="fas fa-arrow-left"></i> Back</button>`;
                $('#traveler-details-list').append(backButton);

                // Handle the "Back to Form" button click
                $('#back-to-form-btn').on('click', function() {
                    $('#submitted-details').hide(); // Hide the details section
                    $('.main-form-container').show(); // Show the form again
                    $('#traveler-details-list').html(''); // Clear the traveler details
                });
            }
        });


        $('input[name="service"]').prop('checked', false); // Uncheck all options
        $('#standardService').prop('checked', true); // Set the standard service (60 dollars) as checked

        // Calculate the total cost with standard service (60 dollars)
        let serviceCost = $('#standardService').val(); // Get the value from the checked radio
        let totalCost = serviceCost * travelerCount;

        // Display the total cost in the table
        $('.table-of-total tbody').html(`
            <tr>
                <td>${$('#standardService').next().text()}</td>
                <td>${travelerCount}</td>
                <td>$${totalCost.toFixed(2)}</td>
            </tr>
        `);
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
    });


});