<template>
  <div>
    
    <h5>Transaction pool</h5>
    <div class="transaction" v-for="tx in transactionPool">
      <div class="row">
        <span>TxId: {{ tx.id }}</span>
      </div>
      <div class="row">
        <div>
          <div v-for="txIn in tx.txIns">
            <hr>
            <div v-if="txIn.signature === ''">coinbase</div>
            <div class="break-word" v-else>{{ txIn.txOutId }} {{ txIn.txOutIndex }}</div>
          </div>
        </div>
        <div>
          <div class="row" v-for="txOut in tx.txOuts">
            <div class="break-word">
              <span>address: {{ txOut.address }}</span>
              amount: {{ txOut.amount }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="transactionPool.length === 0"><span>No transactions in transaction pool</span></div>
    <br>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>hash</th>
          <th>Transactions</th>
          <th>Timestamp</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="block in sortBlocks(blocks)">
          <td>{{ block.index }}</td>
          <td><router-link :to="{ name: 'Block', params: { id: block.hash } }">{{ block.hash }}</router-link></td>
          <td>{{ block.data.length }}</td>
          <td>{{ block.timestamp }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'FrontPage',
  data() {
    return {
      blocks: [],
      transactionPool: [],
    }
  },
  created() {
    this.getBlocks();
    this.getTransactionPool();
  },
  methods: {
    getBlocks: function () {
      this.$http.get('/api/blocks')
        .then((resp) => {
          this.blocks = resp.data;
        })
    },
    sortBlocks: function (blocks) {
      return _(blocks)
        .sortBy('index')
        .reverse()
        .value();
    },
    getTransactionPool: function () {
      this.$http.get('/api/transactionPool')
        .then((resp) => {
          this.transactionPool = resp.data;
        });
    }
  }
}
</script>


<style scoped></style>
