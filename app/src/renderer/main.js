import Vue from 'vue'
import Electron from 'vue-electron'
import PouchDB from 'pouchdb-browser'
import App from './App'

require('bootstrap-webpack')
var _ = require('underscore')
var $ = require('jquery')

const moment = require('moment')

PouchDB.plugin(require('pouchdb-find'))
PouchDB.plugin(require('pouchdb-live-find'))

Vue.use(Electron)
Vue.use(require('vue-pouch'), {
  pouch: PouchDB,
  defaultDB: 'todos'
})
Vue.config.debug = true

/* eslint-disable no-new */
window.myapp = new Vue({
  data: {
    newTodo: {},
    templateTodo: {
      title: '',
      status: 'inbox',
      area: '',
      dueDate: null,
      startDate: null,
      priority: 2,
      project_id: null
    },
    editedTodo: null,
    status: 'inbox'
  },
  pouch: {
    todos: {},
    orderedTodos: function () {
      return {
        selector: {},
        database: 'todos',
        sort: [{dueDate: 'asc'}, {priority: 'asc'}]
      }
    },
    projects: function () {
      return {
        selector: {status: 'project'},
        database: 'todos',
        sort: [{dueDate: 'asc'}, {priority: 'asc'}]
      }
    }
  },
  methods: {
    relativeDate: function (date) {
      var today = moment()
      var test = moment(date)
      if (test.isSame(today, 'day')) {
        return 'Today'
      }
      var raw = test.diff(today)
      if (raw < 0) {
        return moment.duration(raw).humanize() + ' ago'
      } else {
        return 'in ' + moment.duration(raw).humanize()
      }
    },
    refreshView: function () {
      // nothing
    },
    findProject: function (todo) {
      return this.projects.find(function (project) {
        return project._id === todo.project_id
      })
    },
    findProjectTasks: function (project) {
      return this.orderedTodos.filter(function (todo) {
        return todo.project_id === project._id
      })
    },
    visibleTodos: function () {
      if (this.area_filter) {
        return this.focusedTodos().filter(function (todo) {
          return todo.area === window.myapp.area_filter
        })
      } else {
        return this.focusedTodos()
      }
    },
    focusedTodos: function () {
      return this.orderedTodos.filter(function (todo) {
        return todo.status === window.myapp.status
      })
    },
    setView: function (view) {
      this.status = view
    },
    setArea: function (area) {
      if (area) {
        this.area_filter = area
      } else {
        delete (this.area_filter)
      }
      var temp = this.status
      this.setView('archive')
      this.setView(temp)
    },
    saveTodo: function () {
      this.reallySaveTodo(this.newTodo)
    },
    resetNew: function () {
      this.newTodo = JSON.parse(JSON.stringify(this.templateTodo))
      $('#newTask').modal('hide')
    },
    reallySaveTodo: function (todo) {
      if (!todo.title) {
        return
      }
      if (todo.status === 'project') {
        // Update name on tasks
        this.findProjectTasks(todo).forEach(function (t) {
          t.project_name = todo.title
          if (todo.completed) {
            t.completed = true
          }
          window.myapp.$pouch.put('todos', t)
        })
      } else {
        if (todo.project_id) {
          var project = this.findProject(todo)
          todo.project_name = project.title
        }
      }

      // Persist to database
      if (this.newTodo._id) {
        this.$pouch.put('todos', this.newTodo)
      } else {
        this.$pouch.post('todos', todo)
      }
      this.recalculateProjects()
      this.refreshView()
      this.resetNew()
    },
    recalculateScheduled: _.debounce(function () {
      delete (this.area_filter)
      this.view = 'scheduled'
      this.visibleTodos().forEach(function (todo) {
        if (moment(todo.startDate).isBefore(moment())) {
          todo.status = 'next'
          todo.startDate = null
          window.myapp.$pouch.put('todos', todo)
        }
      })
    }, 1000),
    recalculateProjects: _.debounce(function () {
      this.projects.forEach(function (project) {
        if (project.sequential) {
          var tasks = window.myapp.findProjectTasks(project)
          var next = true
          tasks.forEach(function (task) {
            if (!next) {
              if (!task.completed && task.status !== 'waiting' && task.status !== 'archive' && task.status !== 'scheduled') {
                task.status = 'waiting'
                task.waiting_for = 'Project'
                window.myapp.$pouch.put('todos', task)
              }
            } else if (task.completed && task.status === 'waiting') {
              task.status = 'next'
              task.waiting_for = null
              window.myapp.$pouch.put('todos', task)
            } else if (!task.completed && task.status !== 'waiting' && task.status !== 'archive') {
              next = false
            } else if (task.status === 'waiting' && task.waiting_for !== 'Project') {
              next = false
            } else if (task.status === 'waiting' && task.waiting_for === 'Project') {
              task.status = 'next'
              task.waiting_for = null
              window.myapp.$pouch.put('todos', task)
              next = false
            }
          })
        }
      })
    }, 1000),
    archiveDone: function () {
      if (this.status !== 'archive') {
        this.visibleTodos().forEach(function (todo) {
          if (todo.completed) {
            todo.status = 'archive'
            window.myapp.reallySaveTodo(todo)
          }
        })
      } else {
        this.visibleTodos().forEach(function (todo) {
          window.myapp.$pouch.remove('todos', todo)
        })
      }
    },
    editTodo: function (todo) {
      this.newTodo = todo
      $('#newTask').modal('show')
    }
  },
  computed: {
    areas: function () {
      return _.uniq(_.pluck(this.todos, 'area'))
    },
    project_names: function () {
      return _.uniq(_.pluck(this.projects, 'title'))
    }
  },
  created: function () {
    this.resetNew()
  },
  mounted: function () {
    window.setTimeout(window.myapp.refreshView, 1000)
    // this.$databases.todos.createIndex({
    //   index: {fields: ['status']}
    // })
  },
  ...App
})

window.myapp.$mount('#app')
window.setTimeout(window.myapp.recalculateProjects, 5000)
window.setInterval(window.myapp.recalculateScheduled, 300000)
