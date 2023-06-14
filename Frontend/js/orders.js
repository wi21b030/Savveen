$(document).ready(function () {
    $(document).on('click', '#orderCart', function () {
        let isLoggedIn = !!getCookie('username');
        if (!isLoggedIn) {
            alert("Bitte melden Sie sich an, um zu bestellen!");
            $('#modal-placeholder').load('sites/login.html', function () {
                $('#loginModal').modal('show');
            });
            return;
        } else if (isLoggedIn) {
            let username = getCookie('username');
            showAddressModal(username);
        }
    });

    $(document).on('click', '#confirmOrder', function () {
        processOrder();
    });

    $(document).on('click', '#showOrders', function () {
        console.log('showOrders');
        //showOrders();
    })

});

function showAddressModal(username) {
    $.ajax({
        type: "GET",
        url: "../Backend/logic/requestHandler.php",
        data: {
            method: "getProfileData",
            param: JSON.stringify(username),
        },
        dataType: "json",
        success: function (response) {
            $('#modal-placeholder').empty();
            $('#modal-placeholder').load('sites/cart.html #addressModal', function () {
                $('#savedStreet').val(response.adresse);
                $('#savedPostcode').val(response.plz);
                $('#savedCity').val(response.ort);
                $('#addressModal').modal('show');

            });
        },
        error: function () {
            alert("Fehler bei der Abfrage!");
        }
    });
}

function showSuccessfulOrder(receiptID) {
    $('#modal-placeholder').empty();
    $('#modal-placeholder').load('sites/cart.html #receiptModal', function () {
        $('#receiptModal').modal('show');
        $(document).on("click", "#printReceipt", function () {
            printReceipt(receiptID);
        })
    })
}


function printReceipt(receiptID) {
    $.ajax({
        type: "GET",
        url: "../Backend/logic/requestHandler.php",
        data: {
            method: "loadOrderByID",
            param: receiptID,
        },
        dataType: "json",
        success: function (response) {
            if (response.success) {
                const receipt = response.data;
                const date = receipt[0].datum;
                const address = receipt[0].strasse + ', ' + receipt[0].plz + ' ' + receipt[0].ort;
                const receiptID = receipt[0].receipt_id;
                const sum = receipt[0].summe;

                const html = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Rechnung</title>
                        <style>
                            /* General Styles */
                            /* Paste your style.css content here */

                            /* Additional Styles for the receipt */
                            .receipt-container {
                                margin: 20px;
                                padding: 20px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                background-color: #fff;
                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            }

                            .receipt-title {
                                font-size: 24px;
                                font-weight: bold;
                                color: #006837;
                                margin-bottom: 20px;
                            }

                            .receipt-info {
                                margin-bottom: 10px;
                            }

                            .receipt-info strong {
                                font-weight: bold;
                            }

                            .receipt-table {
                                width: 100%;
                                border-collapse: collapse;
                            }

                            .receipt-table th,
                            .receipt-table td {
                                padding: 10px;
                                border: 1px solid #ddd;
                            }

                            .receipt-sum {
                                margin-top: 20px;
                                font-weight: bold;
                            }
                        </style>
                    </head>
                    <body onload="window.print();">
                        <div class="receipt-container">
                            <h1 class="receipt-title">Rechnung</h1>
                            <p class="receipt-info">Rechnungsnummer: <strong>${receiptID}</strong></p>
                            <p class="receipt-info">Datum: <strong>${date}</strong></p>
                            <p class="receipt-info">Adresse: <strong>${address}</strong></p>
                            <table class="receipt-table">
                                <thead>
                                    <tr>
                                        <th>Produkte</th>
                                        <th>Preis</th>
                                        <th>Anzahl</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${receipt.map(orderLine => `
                                        <tr>
                                            <td>${orderLine.product_name}</td>
                                            <td>${orderLine.preis}€</td>
                                            <td>${orderLine.anzahl}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <p class="receipt-sum">Summe: <strong>${sum}€</strong></p>
                        </div>
                    </body>
                    </html>
                `;

                const receiptWindow = window.open("", "_blank");
                receiptWindow.document.open();
                receiptWindow.document.write(html);
                receiptWindow.document.close();
            } else {
                showModalAlert("Rechnungsdaten inkorrekt!", "warning");
            }
        },
        error: function () {
            alert("Fehler beim Laden der Rechnung!");
        },
    });
}

function processOrder() {
    let username = getCookie('username');
    let orderData = {
        username: username,
        cartItems: [],
    };
    let myCart = JSON.parse(sessionStorage.getItem('myCart'));
    let cartItems = myCart.map(item => {
        return {
            id: item.id,
            price: item.price,
            quantity: item.quant,
        };
    });
    orderData.cartItems = cartItems;
    const selectedAddressId = $('input[name="addressType"]:checked').attr('id');
    if (selectedAddressId === 'savedAddress') {
        orderData.address = $('#savedStreet').val();
        orderData.postcode = $('#savedPostcode').val();
        orderData.city = $('#savedCity').val();
    } else {
        let newStreet = $('#newOrderStreet').val();
        let newPostcode = $('#newOrderPostcode').val();
        let newCity = $('#newOrderCity').val();

        if (!newStreet || !newPostcode || !newCity) {
            showModalAlert('Bitte geben Sie eine vollständige Adresse an!', 'warning');
            return;
        }

        orderData.address = newStreet;
        orderData.postcode = newPostcode;
        orderData.city = newCity;
    }

    $.ajax({
        type: 'POST',
        url: '../Backend/logic/requestHandler.php',
        data: {
            method: 'processOrder',
            param: JSON.stringify(orderData)
        },
        dataType: 'json',
        success: function (response) {
            if (response.success) {
                sessionStorage.removeItem('myCart');
                let myCart = [];
                sessionStorage.setItem("myCart", JSON.stringify(myCart));
                let length = myCart.reduce((total, item) => total + item.quant, 0);
                updateCartCounter(length);
                updateCartItems(myCart);
                $('#addressModal').modal('hide');
                $('#modal-placeholder').empty();
                showSuccessfulOrder(response.receipt);
            } else {
                showModalAlert(response.error, 'warning')
            }
        },
        error: function () {
            showModalAlert('Fehler beim Bestellen!', 'danger');
        }
    });

}
