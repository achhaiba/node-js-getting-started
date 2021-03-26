// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/account/apikeys
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51HbGI5ACVdhg5BcJbXdDKlwlfnILAHB7TtPLtxpXXPvsfoOW8SlyN9jmnVINZxLJ9HR8bcNF22IM1K2iLb8hKvIv00FHPqMf34');

const admin = require('firebase-admin');
//const serviceAccount = require('./serviceAccountKey.json');
//const config = require('./serviceAccountKey.js').config;
//const serviceAccount = JSON.parse(JSON.stringify(config));
//var serviceAccount = process.env.GSA_CREDENTIALS;
//console.log(`Service account = ${serviceAccount}`);

//console.log(`process.env = ${process.env}`);

//initialize admin SDK using serciceAcountKey
admin.initializeApp({
  //credential: admin.credential.cert(serviceAccount),
  credential: admin.credential.cert({
    "type": "service_account",
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": "1658bbd62c3c35fb17b095c864fd471b3b32a3e8",
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": "116982750101067232743",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-v1pr2%40hello-e3767.iam.gserviceaccount.com"
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});
const db = admin.firestore();

const cool = require('cool-ascii-faces');
const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
var app = express();
//const router = express.Router();

app
  .use(express.json())
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/cool', (req, res) => res.send(cool()))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))



app.post('/createConnectAccount', async(req, res, next) => {
  var data = req.body
  var email = data.email
  var response = {}
  stripe.accounts.create(
    {
      type: 'express',
      country: 'US',
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      email: email,
      //business_type: 'individual',
    },
      function(err, account) {
        if (err) {
          console.log("Couldn't create stripe account: " + err)
          return res.send(err)
      }
      console.log("ACCOUNT: " + account.id)
      response.body = {success: account.id}
      return res.send(response)
    }
  );
});

app.post('/createStripeAccountLink', async(req, res, next) => {
  var data = req.body
  var accountID = data.accountID
  var response = {}
  stripe.accountLinks.create({
    account: accountID,
    refresh_url: 'https://subaito.com/wallet-ready/',
    return_url: 'https://subaito.com/wallet-ready/',
    //refresh_url: 'https://subaito.com/app/connect?onboard=reauth',
    //return_url: 'https://subaito.com/app/connect?onboard=return',
    //refresh_url: 'subaito://app/connect?onboard=reauth',
    //return_url: 'subaito://app/connect?onboard=return',
    type: 'account_onboarding',
    //collect: 'eventually_due',
  }, function(err, accountLink) {
    if (err) {
      console.log(err)
      response.body = {failure: err}
      return res.send(response)
    }
    console.log(accountLink.url)
    response.body = {success: accountLink.url}
    return res.send(response)
  });
});

app.post('/retrieveConnectAccount', async(req, res, next) => {
  var data = req.body
  var accountID = data.accountID
  var response = {}
  stripe.accounts.retrieve({
    stripeAccount: accountID,
  }, 
    function(err, account) {
        if (err) {
          console.log("Couldn't retrieve stripe account: " + err)
          return res.send(err)
      }
      console.log("ACCOUNT: " + account)
      response.body = {success: account}
      return res.send(response)
    }
  );
});

app.post('/createStripeLoginLink', async(req, res, next) => {
  var data = req.body
  var accountID = data.accountID
  var response = {}
  try {
    // Generate a unique login link for the associated Stripe account to access their Express dashboard
    const loginLink = await stripe.accounts.createLoginLink(
      accountID, {
        redirect_url: 'https://subaito.com/app/connect?onboard=return'
      }
    );
    
    console.log(loginLink.url)
    response.body = {success: loginLink.url}
    return res.send(response)
  } catch (err) {
    console.log(err)
    response.body = {failure: err}
    return res.send(response)
  }

  // var data = req.body
  // var accountID = data.accountID
  // var response = {}
  // stripe.accounts.createLoginLink({
  //   accountID,
  //   redirect_url: 'https://subaito.com/app/',
  // }, function(err, loginLink) {
  //   if (err) {
  //     console.log(err)
  //     response.body = {failure: err}
  //     return res.send(response)
  //   }
  //   console.log(loginLink.url)
  //   response.body = {success: loginLink.url}
  //   return res.send(response)
  // });
});

app.post('/createConnectCustomer', async(req, res, next) => {
  var data = req.body
  var email = data.email
  var fullName = data.fullName
  var response = {}
  stripe.customers.create(
    {
      email: email,
      description: fullName,
      name: fullName,
    },
      function(err, customer) {
        if (err) {
          console.log("Couldn't create stripe customer: " + err)
          return res.send(err)
      }
      console.log("CUSTOMER: " + customer.id)
      response.body = {success: customer.id}
      return res.send(response)
    }
  );
});

app.post('/createCustomerEphemeralKey', async(req, res, next) => {
  try {
    const { apiVersion, customerId } = req.body
    // Create ephemeral key for customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      {customer: customerId},
      {apiVersion: apiVersion}
    );
    console.log(ephemeralKey)
    return res.json(ephemeralKey);
  } catch (err) {
    console.log(err)
    return next(err)
  }
})

app.post('/createPaymentIntent', async(req, res, next) => {
  var data = req.body
  var amount = data.amount
  var currency = data.currency
  var feeAmount = data.feeAmount
  var customerId = data.customerId
  var connectedAccountId = data.connectedAccountId
  var receipt_email = data.receipt_email
  var description = data.description
  var response = {}
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      payment_method_types: ['card'],
      amount: amount,
      currency: currency,
      application_fee_amount: feeAmount,
      customer: customerId,
      transfer_data: {
        destination: connectedAccountId,
      },
      receipt_email: receipt_email,
      description: description,
    });
    
    console.log(paymentIntent)
    response.body = {success: paymentIntent.client_secret}
    return res.send(response)
  } catch (err) {
    console.log(err)
    response.body = {failure: err}
    return res.send(response)
  }
});

app.post('/createInvoice', async(req, res, next) => {
  var data = req.body
  var currency = data.currency
  var description = data.description
  var quantity = data.quantity
  var unit_amount = data.unit_amount
  var feeAmount = data.feeAmount
  var customerId = data.customerId
  var connectedAccountId = data.connectedAccountId
  var response = {}
  try {
    const invoiceItem = await stripe.invoiceItems.create({
      currency: currency,
      description: description,
      quantity: quantity,
      unit_amount: unit_amount,
      customer: customerId,
    });

    const invoice = await stripe.invoices.create({
      on_behalf_of: connectedAccountId,
      application_fee_amount: feeAmount,
      customer: customerId,
      transfer_data: {
        destination: connectedAccountId,
      },
      auto_advance: true, // auto-finalize this draft after ~1 hour
      collection_method: 'charge_automatically',
    });
    
    console.log(invoiceItem)
    console.log(invoice)
    response.body = {success: invoice.id}
    return res.send(response)
  } catch (err) {
    console.log(err)
    response.body = {failure: err}
    return res.send(response)
  }
});

app.post('/payInvoice', async(req, res, next) => {
  var data = req.body
  var invoiceId = data.invoiceId
  var payment_method = data.paymentMethod

  stripe.invoices.pay(invoiceId, payment_method, function(err, invoice) {
    // asynchronously called
    if (err) {
      console.log("Couldn't pay invoice: " + err)
      return res.send(err)
    }
    console.log(invoice.id)
    response.body = {success: invoice.id}
    return res.send(response)
    });
});

app.post('/sendPushNotification', async(req, res, next) => {
  var data = req.body
  var token = data.token
  var title = data.title
  var body = data.body

  var payload = {
    notification: {
      title: title,
      body: body
    }
  };

  //admin.messaging().sendToTopic("notifications", payload)
  admin.messaging().sendToDevice(token, payload)
  .then(function(response) {
    console.log("Successfully sent push notification:", response);
    return res.send(response)
  })
  .catch(function(error) {
    console.log("Error sending push notification:", error);
    return next(err)
  });

});


// module.exports = router;