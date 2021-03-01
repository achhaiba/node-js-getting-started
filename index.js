// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/account/apikeys
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51HbGI5ACVdhg5BcJbXdDKlwlfnILAHB7TtPLtxpXXPvsfoOW8SlyN9jmnVINZxLJ9HR8bcNF22IM1K2iLb8hKvIv00FHPqMf34');

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
    refresh_url: 'https://subaito.com/app/connect?onboard=reauth',
    return_url: 'https://subaito.com/app/connect?onboard=return',
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
  var connectedStripeAccountId = data.connectedStripeAccountId
  var response = {}
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      payment_method_types: ['card'],
      amount: amount,
      currency: currency,
      application_fee_amount: feeAmount,
      customer: customerId,
      transfer_data: {
        destination: connectedStripeAccountId,
      },
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

// module.exports = router;