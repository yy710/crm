<template>
  <van-cell-group>
    <van-field v-model="username" required label="客户姓名" left-icon="contact" placeholder="请输入客户姓名"></van-field>
    <van-field v-model="phone" required label="手机号" placeholder="请输入手机号" left-icon="phone-o"></van-field>
  </van-cell-group>
</template>

<script>
module.exports = {
  data: function() {
    return {
      username: "world",
      phone: null
    };
  }
};
</script>

<style>
</style>