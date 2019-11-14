<template>
  <van-panel title="姓名：夏侯渊" desc="电话：13000000000" status="新客户">
    <div>此处显示用户画像信息</div>
    <div slot="footer">
      <van-button round disabled type="warning" size="small">三天后回访</van-button>
    </div>
  </van-panel>
</template>

<script>
module.exports = {
    data: function() {
        return {
            who: 'world'
        }
    }
};
</script>

<style>
</style>