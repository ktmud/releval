<template>
  <div id="app">
    <header>
      <el-col :span="3" :xs="5">
        <router-link to="/" class="site-logo">
          RelEval
        </router-link>
      </el-col>
      <el-col :span="10">
        <search-form inline icon="search" size="76" />
      </el-col>
    </header>
    <div class="main">
      <router-view></router-view>
    </div>
    <footer>
      <div class="container">
        <el-row>
          <el-col :span="21" :offset="1" :xs="{offset:0, span:24}">
            &copy; 2017 <a href="http://github.com/ktmud/releval" target="_blank">RelEval</a>
                   by <a href="http://github.com/ktmud" target="_blank">ktmud</a>
          </el-col>
        </el-row>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'app',
}
</script>

<style lang="sass">
@import "./assets/theme";
</style>
