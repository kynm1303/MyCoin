<template>
  <!-- dont have private key -->
  <div v-if="auth != true">
    <div>
      <h5>Create New Wallet</h5>

      <b-row>
        <b-col cols="6"><button v-on:click="createWallet" class="button-primary">Create Wallet</button></b-col>
        <b-col cols="6"><button v-on:click="loginWallet" class="button-primary">Login Your Wallet</button></b-col>
      </b-row>

      <div v-if="chooseLogin == true">
        <label for="privateKey">Your Private Key</label>
        <input v-model="privateKey" class="u-full-width" type="text" placeholder="04f72a4541275aeb4344a8b04..."
          id="privateKey">
        <button v-on:click="inputPrivateKey" class="button-primary">Send</button>
      </div>
      <br>
    </div>
  </div>
  <!-- logged in -->
  <div v-else>
    <div>
      <div class="row break-word">
        Your private key: <h5 class="break-word">{{ privateKey }}</h5>
      </div>
      <div class="row break-word">
        Your public address: <h5 class="break-word">{{ address }}</h5>
      </div>
      <div class="row">
        Your balance: <h5>{{ balance }}</h5>
      </div>
      <button v-on:click="getBalance" class="button-primary">Refresh balance</button>
    </div>
    <form>
      <div class="row">
        <div class="ten columns">
          <label for="receiverAddress">Receiver address</label>
          <input v-model="receiverAddress" class="u-full-width" type="text" placeholder="04f72a4541275aeb4344a8b04..."
            id="receiverAddress">
        </div>
        <div class="two columns">
          <label for="amount">Amount</label>
          <input v-model="receiverAmount" class="u-full-width" type="number" placeholder="0" id="amount">
        </div>
      </div>
      <button v-on:click="sendTransaction" class="button-primary">Send</button>
    </form>
    <h5>Mine block</h5>
    <button v-on:click="mineBlock" class="button-primary">Click to mine block</button>
    <div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FrontPage',
  data() {
    return {
      'chooseLogin': null,
      'privateKey': null,
      'auth': null,
      'address': null,
      'balance': null,
      'transactionPool': [],
      'receiverAddress': null,
      'receiverAmount': null
    }
  },
  created() {

  },
  methods: {
    getBalance: function () {
      this.$http.post('/api/balance', {
        privateKey: this.privateKey
      })
        .then(resp => {
          this.balance = resp.data.balance;
        })
    },
    createWallet: function () {
      this.$http.post('/api/register')
        .then((resp) => {
          console.log(resp);
          this.privateKey = resp.data.privateKey;
          this.address = resp.data.address;
          this.auth = true;
          this.getBalance();
        })
    },
    loginWallet: function () {
      this.chooseLogin = true;
    },
    inputPrivateKey: function () {
      console.log("inputPrivateKey", this.privateKey);
      this.$http.post('/api/login',
        {
          privateKey: this.privateKey
        })
        .then((resp) => {
          console.log(resp);
          if (resp.data.address != null) {
            this.address = resp.data.address;
            this.auth = true;
            this.getBalance();
          } else {
            this.privateKey = null;
            this.address = null;
            this.auth = false;
          }
        })
    },
    sendTransaction: function () {
      this.$http.post('/api/sendTransaction',
        {
          'privateKey': this.privateKey,
          'amount': parseInt(this.receiverAmount),
          'address': this.receiverAddress
        })
        .then(() => {
          this.receiverAmount = '';
          this.receiverAddress = '';
        })
    },

    mineBlock: function () {
      this.$http.post('/api/mineBlock',
        {
          privateKey: this.privateKey
        })
        .then(() => {
          this.getBalance();
        })
    },
  }
}
</script>


<style scoped>
.transaction {
  padding: 1em;
  margin-bottom: 1em;
  background-color: gainsboro;
}
</style>
