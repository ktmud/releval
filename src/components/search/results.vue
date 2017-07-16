<template>
  <div class="results">
    <div class="result-item" v-for="(item, index) in items"
      :class="{ active: item.active }"
      @mouseenter="activate(item)">
      <span class="result-item-count">{{ start + item.index + 1 }}</span>
      <!--
        <el-tooltip content="Non-relevant">
        </el-tooltip>
        <el-tooltip content="Relevant">
        </el-tooltip>
        <el-tooltip content="Very relevant">
        </el-tooltip>
      -->
      <el-radio-group v-model="grades[item.url]" size="small" @click.native="clickGrader">
        <el-radio-button label="0">
          <i class="el-icon-close"></i>
        </el-radio-button>
        <el-radio-button label="1">
          <i class="el-icon-minus"></i>
        </el-radio-button>
        <el-radio-button label="2">
          <i class="el-icon-check"></i>
        </el-radio-button>
      </el-radio-group>
      <h4>
        <a :href="item.url" target="_blank" :title="item.title">
          <span v-html="item.title_h"></span>
        </a>
        <el-tooltip :content="'Link depth: ' + item.depth" placement="right">
          <span class="badge">{{ item.depth }}</span>
        </el-tooltip>
      </h4>
      <p class="result-url" v-html="item.url_h"></p>
      <div class="result-desc" v-if="item.exerpt">
        <p class="result-exerpt" v-for="exerpt in item.exerpt">
          <span v-html="exerpt"></span>
        </p>
      </div>
    </div>
    <div class="no-result" v-if="items.length == 0">No more results can be found.</div>
  </div>
</template>

<script>
import Vue from 'vue'
import Velocity from 'velocity-animate'

export default {
  props: ['items', 'query', 'start'],
  data() {
    let grades = {}
    this.items.forEach((item, i) => {
      this.$set(item, 'active', i == 0 ? true : false)
      item.index = i
      grades[item.url] = item.grade
    })
    return {
      currentItem: this.items[0],
      lastGrades: {...grades},
      // grades of urls in current page
      grades: grades
    }
  },
  watch: {
    'grades': {
      handler: function(grades) {
        this.$emit('updateRating', grades)
      },
      deep: true
    }
  },
  methods: {
    resetRating () {
      let grades = {}
      this.items.forEach(item => {
        grades[item.url] = undefined
      })
      this.grades = grades
    },
    activate (item) {
      if (this.scrolling) {
        return
      }
      if (this.currentItem) {
        this.deactive(this.currentItem);
      }
      item.active = true
      this.currentItem = item
    },
    deactive (item) {
      item.active = false
    },
    prevPage () {
      this.$emit('prevPage')
    },
    nextPage () {
      this.$emit('nextPage')
    },
    nextItem () {
      if (this.currentItem.index == this.items.length - 1) {
        this.nextPage()
        return
      }
      this.activate(this.items[this.currentItem.index + 1])
      this.scrollCurrentIntoView()
    },
    prevItem () {
      if (this.currentItem.index == 0) {
        this.prevPage();
        return
      }
      this.activate(this.items[this.currentItem.index - 1])
      this.scrollCurrentIntoView()
    },
    markItem (grade) {
      this.grades[this.currentItem.url] = grade
      this.$nextTick(() => {
        this.nextItem()
      })
    },
    scrollCurrentIntoView () {
      let current = this.currentItem
      let $current = this.$el.querySelectorAll('.result-item')[current.index]
      if ($current) {
        this.scrolling = true
        let top = $current.offsetTop - 20
        Velocity(document.documentElement, 'stop')
        Velocity(document.documentElement, 'scroll', {
          offset: top,
          easing: 'ease-in-out',
          mobileHA: false,
          duration: 600
        })
        this.$nextTick(() => {
          this.scrolling = false
        })
      }
    },
    clickGrader (event) {
      // click event trigger by the input[type=radio]
      if (event.target.tagName == 'INPUT') {
        if (event.target.value == this.lastGrades[this.currentItem.url]) {
          this.grades[this.currentItem.url] = null
          this.lastGrades[this.currentItem.url] = null
        } else {
          this.lastGrades[this.currentItem.url] = event.target.value
        }
      }
    },
  },
  mounted () {
    window.addEventListener('keydown', (event) => {
      if (event.target.tagName == 'INPUT') {
        return
      }
      switch(event.key) {
        case 'j':
          this.nextItem()
          break;
        case 'k':
          this.prevItem()
          break;
        case 'h':
          this.prevPage()
          break;
        case 'l':
          this.nextPage()
          break;
        case '0':
        case '1':
        case '2':
          this.markItem(event.key)
        default:
          // do nothing
      }
    })
  },
}
</script>

<style lang="sass">
.results
  margin: 10px 0 20px;
.results-count
  margin: 0 0 20px 1px;
  font-size: 13px;
  color: #888;
.result-item
  position: relative;
  margin-bottom: 25px;
  // margin-bottom: 15px;
  // padding: 0.5em 1em;
  // border: 1px solid #f0f0f0;
  // box-shadow: 0 2px 0 rgba(0,0,0,0.04);
  &.active
    background: #fffff0;
  .badge
    background: #f3f3f3;
    border-radius: 50%;
    display: inline-block;
    color: #aaa;
    line-height: 1;
    width: 1em;
    text-align: center;
    padding: 4px;
    font-size: 13px;
    vertical-align: top;
  em
    font-weight: 600;
    font-style: normal;
  h4
    line-height: 1.3em;
    margin: 0;
    font-weight: 400;
    font-size: 17px;
  p
    line-height: 1.5em;
    margin: 8px 0;
    font-size: 12px;
  .result-url
    margin: 0;
    color: #006621;
    font-size: 14px;
  .result-url, h4 a
    display: inline-block;
    max-width: 100%;
    text-overflow: ellipsis;
    max-height: 1.3em;
    overflow: hidden;
    white-space: nowrap;
  h4 a
    max-width: 80%;
  .el-radio-group
    padding: 0 0 3px 3px;
    background: #fff;
    position: absolute;
    right: 0;
    top: 0;
.result-date
  display: inline-block;
  color: #666;
  margin-right: 2px;
.result-item-count
  position: absolute;
  right: 100%;
  margin-right: 0.5em;
  min-width: 1em;
  padding: 0 0.3em;
  top: 1px;
  line-height: 1.6em;
  text-align: center;
  border: 1px solid #ccc;
  color: #666;
  border-radius: 4px;
  font-size: 13px;
</style>
