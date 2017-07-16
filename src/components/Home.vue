<template>
  <div class="search-results" v-loading="loading">
    <el-row>
      <el-col :span="1">
        &nbsp;
      </el-col>
      <el-col :span="12">
        <div class="container results" v-if="!loading">
          <p class="no-results" v-if="!hasQuery">
            What do you want to search today?
          </p>
          <p class="no-results" v-if="hasQuery && !hasResults">
            Nothing Found. :(
          </p>
          <el-alert type="error" v-if="error" show-icon
            :title="error.title"
            :description="error.description"
            ></el-alert>
          <div class="results" v-if="hasResults">
            <p class="results-count text-sm">
              {{ start + 1 }} to {{ end }} of {{ meta.total }} results ({{ meta.took }} seconds)
            </p>
            <search-results ref="results"
              :start="start" :query="query" :items="hits"
              @updateRating="updateRating"
              @nextPage="nextPage"
              @prevPage="prevPage"
              ></search-results>
            <!-- elastic search only allow -->
            <el-pagination layout="prev, pager, next"
              :total="totalMax"
              :page-size="size"
              :current-page.sync="currentPage"
              @current-change="gotoPage"
              ></el-pagination>
          </div>
        </div>
      </el-col>
      <el-col :span="9">
        <el-card class="box-card" v-if="!loading">
          <div slot="header" class="clearfix">
            <el-progress
              :stroke-width="18"
              :percentage="percentage" :text-inside="true"></el-progress>
            <table>
              <tr>
                <th>
                  <el-input size="small" v-model="queryId" placeholder="QueryID"></el-input>
                </th>
                <th>
                  <el-input size="small" v-model="assessorId" placeholder="AssessorID"></el-input>
                </th>
                <th style="width: auto;">DocID</th>
                <th style="width: 2em;">Grade</th>
              </tr>
            </table>
          </div>
          <div class="card-content">
            <div class="tip" v-if="!graded.length">
              <p>Keyboard shortcut:</p>
              <dl>
                <dt><kbd>j</kbd></dt>
                <dd>Next item</dd>
                <dt><kbd>k</kbd></dt>
                <dd>Previous item</dd>
                <dt>
                  <kbd>0</kbd>
                  <kbd>1</kbd>
                  <kbd>2</kbd>
                </dt>
                <dd>Grade current item</dd>
              </dl>
            </div>
            <table class="table" style="width: 100%;">
              <tr v-for="item in graded" :key="item.url"
                :class="item.url == justUpdated ? 'just-updated' : ''">
                <td style="width: 4em;">{{ queryId }}</td>
                <td style="width: 4em;">{{ assessorId }}</td>
                <td style="width: auto;">
                  <span class="url">{{ item.url.replace(/^https?:\/\/(www\.)?/, '') }}</span>
                </td>
                <td style="width: 2em;" class="grade">{{ item.grade }}</td>
              </tr>
            </table>
          </div>
          <div class="card-foot">
            <el-form inline>
              <el-form-item label="Show all graded" style="float: left;">
                <el-switch v-model="showAll" on-text="" off-text=""></el-switch>
              </el-form-item>
              <el-button size="small" @click="resetRating">Reset</el-button>
              <el-button type="primary" size="small" @click="exportRating">Export</el-button>
            </el-form>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import router from '@/router'
import api from '@/api/search'
import storage from '@/api/storage'
import SearchResults from '@/components/search/results'


export default {
  name: 'releval',
  components: {
    SearchResults,
  },
  data () {
    return {
      queryId: '',
      assessorId: '',
      loading: true,
      error: null,
      query: '',
      index: '',
      start: 0,
      size: 0,
      res: {},
      currentPage: 1,
      rated: {},
      justUpdated: null,
      showAll: true,
    }
  },
  computed: {
    end () {
      return Math.min(this.meta.total, this.start + this.size)
    },
    meta () {
      return this.res.meta || {}
    },
    hits () {
      let hits = this.res.hits || []
      let rated = this.rated
      hits.forEach(item => {
        item.grade = rated[item.url]
      })
      return hits
    },
    hasResults () {
      return this.meta.total > 0
    },
    hasQuery () {
      return this.query.length > 0
    },
    totalPage () {
      return Math.ceil(this.meta.total / this.size)
    },
    totalMax () {
      // elastic search only allows at most 10,000 items
      // when using `from` and `size`
      return Math.min(this.meta.total, 10000)
    },
    currentUrls () {
      let ret = {}
      this.hits.forEach(item => {
        ret[item.url] = 1
      })
      return ret
    },
    graded () {
      let ret = this.hits.filter(item => {
        return item.url in this.rated
      }).map(item => {
        return {
          url: item.url,
          grade: this.rated[item.url]
        }
      })
      if (this.showAll) {
        // prepend other graded urls
        for (var url in this.rated) {
          if (!(url in this.currentUrls)) {
            ret.unshift({
              url: url,
              grade: this.rated[url]
            })
          }
        }
      }
      return ret
    },
    percentage () {
      return Object.keys(this.rated).length / 2
    },
  },
  methods: {
    updateRating (grades = {}) {
      let rated = { ...this.rated }
      for (var url in grades) {
        if (grades[url] !== undefined) {
          if (grades[url] != rated[url]) {
            this.justUpdated = url
          }
          if (grades[url] === null) {
            delete rated[url]
          } else {
            rated[url] = grades[url]
          }
        }
      }
      this.rated = rated
      storage.dump('q:' + this.query, {
        queryId: this.queryId,
        rated: rated
      })
      this.$nextTick(() => {
        this.scrollCurrentIntoView()
      })
    },
    scrollCurrentIntoView () {
      let $justUpdated = this.$el.querySelector('.just-updated')
      let position = $justUpdated && $justUpdated.offsetTop
      if (position) {
        this.$el.querySelector('.card-content').scrollTop = position - 25
      }
    },
    resetRating () {
      this.rated = {}
      this.updateRating()
      this.$refs.results.resetRating()
    },
    exportRating () {
      let text = ''
      for (var url in this.rated) {
        text += `${this.queryId} ${this.assessorId} ${url} ${this.rated[url]}\n`
      }
      let blob = new Blob([text], {type: 'texp/plain'})
      let textFile = window.URL.createObjectURL(blob);
      let link = document.createElement('a')
      link.href = textFile
      link.target = '_blank'
      link.download = `QREL_${this.queryId || '00000'}_${this.assessorId || 'annonymous'}.txt`
      link.click()
    },
    updateConfig () {
      storage.dump('configs', {
        showAll: this.showAll,
        assessorId: this.assessorId
      })
    },
    updateQuery ($route) {
      $route = $route || this.$route
      var query = $route.query
      this.query = (query.q || '').trim()
      this.index = (query.index || '').trim()
      this.start = parseInt(query.start) || 0
      // page size
      this.size = parseInt(query.size) || 50
      this.currentPage = Math.ceil((this.start + 1) / this.size)
    },
    loadResults () {
      return Promise.all([
        storage.load('configs').then(config => {
          config = config || {}
          this.assessorId = config.assessorId
          this.showAll = config.showAll
        }),
        storage.load('q:' + this.query).then(data => {
          data = data || {}
          this.queryId = data.queryId
          this.rated = data.rated || {}
        }),
        api.search({
          index: api.defaultIndex || this.index,
          query: this.query,
          start: this.start,
          size: this.size
        }).then((body) => {
          this.res = body
        }, (error) => {
          this.error = {
            title: error.statusCode + ' ' + error.displayName,
            description: error.message,
          }
        })
      ]).then(() => {
        this.loading = false
      })
    },
    gotoPage (page) {
      var start = (page - 1) * this.size
      router.push({
        query: {
          q: this.query,
          start: start,
          size: this.size
        }
      })
    },
    nextPage () {
      this.gotoPage(this.currentPage + 1)
    },
    prevPage () {
      if (this.currentPage > 1) {
        this.gotoPage(this.currentPage - 1)
      }
    }
  },
  watch: {
    '$route' (to, from) {
      this.updateQuery(to)
      this.loading = true
      this.loadResults()
    },
    'queryId' (to) {
      this.updateRating()
    },
    'assessorId' (to) {
      this.updateConfig()
    },
  },
  beforeMount () {
    this.updateQuery()
    if (!this.query) {
      this.loading = false;
    }
  },
  mounted () {
    if (!this.loading) {
      return;
    }
    this.loadResults()
  },
  components: {
    SearchResults
  }
}
</script>

<style lang="sass">
  .el-progress
    margin-bottom: 10px;
  .el-card
    margin-left: 30px;
    position: fixed;
    margin-right: 11px;
    top: 11px;
    bottom: 55px;
    table
      font-size: 12px;
    th, td
      width: 25%
  .el-card__header
    padding: 10px;
  .card-content
    position: absolute;
    top: 100px;
    bottom: 50px;
    left: 10px;
    right: 10px;
    overflow: auto;
    .tip
      font-size: 14px;
      color: #999;
      max-width: 300px;
      margin: 30px auto;
      dt
        float: left;
        clear: left;
        margin-right: 10px;
      dd
        line-height: 26px;
        margin-bottom: 8px;
      kbd
        border-radius: 4px 4px 3px 3px;
        display: inline-block;
        border: solid 1px #ddd;
        padding: 2px 12px 4px;
        box-shadow: 0 2px 0 rgba(0,0,0,0.1);
  .card-foot
    position: absolute;
    bottom: 10px;
    text-align: right;
    right: 10px;
    left: 10px;
    .el-form-item
      margin-bottom: 0;
    .el-form-item__label
      padding: 8px 8px 0 0;
    .el-form-item__content
      line-height: 28px;
  .table
    .url
      display: inline-block;
      overflow: hidden;
      height: 1.2em;
      line-height: 1.2em;
      max-width: 30em;
      white-space: nowrap;
      text-overflow: ellipsis;
  .table td
    padding: 3px;
    border-bottom: 1px solid #f0f0f0;
  .just-updated
    background: #ffffe9;
    font-weight: 600;
  .just-updated .grade
    color: #f00;

  .el-loading-spinner
    margin-top: 50px;
  .text-sm
    font-size: 13px;
  .el-alert__description
    padding-bottom: 5px;
  .el-loading-mask.el-loading-fade-enter-active
    transition-delay: 1s;
  .el-pagination
    padding: 20px 0;
  .el-pager li
    font-size: 16px;
    min-width: 34px;
    padding-left: 8px;
    padding-right: 8px;
    height: 34px;
    line-height: 34px;
  .el-pagination span, .el-pagination button
    font-size: 16px;
    min-width: 34px;
    height: 34px;
    line-height: 34px;
  .el-pager li.btn-quicknext, .el-pager li.btn-quickprev
    font-size: 12px;
    line-height: 34px;
</style>
