<template>
  <div id="app">
  <nav class="navbar navbar-default">
    <div class="container-fluid">
      <div class="navbar-header">
        <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
          <span class="sr-only">Toggle navigation</span>
          <span class="icon-bar"></span>
          <span class="icon-bar"></span>
          <span class="icon-bar"></span>
        </button>
        <span class="navbar-brand" href="#"><span id="checkLogo">✔ </span><a href="#" data-toggle="modal" data-target="#newTask">Accomplish</a></span>
      </div>
      <div id="navbar" class="navbar-collapse collapse">
        <ul class="nav navbar-nav">
          <li v-bind:class="{ active: this.status === 'inbox' }"><a href="#" @click="setView('inbox')">Inbox</a></li>
          <li v-bind:class="{ active: this.status === 'next' }"><a href="#" @click="setView('next')">Next</a></li>
          <li v-bind:class="{ active: this.status === 'waiting' }"><a href="#" @click="setView('waiting')">Waiting</a></li>
          <li v-bind:class="{ active: this.status === 'scheduled' }"><a href="#" @click="setView('scheduled')">Deferred</a></li>
          <li v-bind:class="{ active: this.status === 'project' }"><a href="#" @click="setView('project')">Project</a></li>
          <li v-bind:class="{ active: this.status === 'someday' }"><a href="#" @click="setView('someday')">Someday</a></li>
          <li v-bind:class="{ active: this.status === 'archive' }"><a href="#" @click="setView('archive')">Archive</a></li>
        </ul>
        <ul class="nav navbar-nav navbar-right">
          <li class="dropdown">
            <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Contexts <span class="caret" v-if="areas.length > 0"></span></a>
            <ul class="dropdown-menu">
              <li><a href="#"  @click="setArea()">All</a></li>
              <li v-for="area in areas"><a href="#" @click="setArea(area)">{{ area }}</a></li>
            </ul>
          </li>
        </ul>
      </div><!--/.nav-collapse -->
    </div><!--/.container-fluid -->
    </nav>
    <div class="modal fade" tabindex="-1" role="dialog" id="newTask">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h4 class="modal-title">Task</h4>
          </div>
          <div class="modal-body">
            <form>
              <div class="form-group">
                <input class="form-control" autocomplete="off" placeholder="Task Name" v-model.lazy.trim="newTodo.title">
              </div>
              <div class="form-group">
                <select class="form-control" v-model="newTodo.status">
                  <option value="inbox">Inbox</option>
                  <option value="next">Next</option>
                  <option value="waiting">Waiting</option>
                  <option value="scheduled">Deferred</option>
                  <option value="project">Project</option>
                  <option value="someday">Someday</option>
                  <option value="archive">Archive</option>
                </select>
              </div>
              <div class="form-group" v-if="newTodo.status === 'project'">
                <div class="checkbox">
                  <label>
                    <input type="checkbox" v-model="newTodo.sequential"> Sequential Project
                  </label>
                </div>
              </div>
              <div class="form-group" v-if="newTodo.status === 'waiting'">
                  <input type="text" v-model="newTodo.waiting_for" class="form-control" placeholder="Reason for Delay">
              </div>
              <div class="form-group">
                <div class="input-group">
                  <div class="input-group-btn">
                    <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Context <span class="caret" v-if="areas.length > 0"></span></button>
                    <ul class="dropdown-menu">
                      <li v-for="area in areas"><a href="#" @click="newTodo.area = area">{{ area }}</a></li>
                    </ul>
                  </div>
                  <input type="text" class="form-control" v-model.lazy.trim="newTodo.area">
                </div>
              </div>
              <div class="form-group" v-if="newTodo.status !== 'project'">
                <select class="form-control" v-model="newTodo.project_id">
                  <option value="">Single Task</option>
                  <option v-for="project in projects" :value="project._id">{{ project.title }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Due Date</label>
                <input type="date" class="form-control" v-model="newTodo.dueDate">
              </div>
              <div class="form-group" v-if="newTodo.status === 'scheduled' || newTodo.status === 'project'">
                <label>Start Date</label>
                <input type="date" class="form-control" v-model="newTodo.startDate">
              </div>
              <div class="form-group">
                <div class="radio-inline">
                  <label>
                    <input type="radio" v-model="newTodo.priority" value="3">
                    Low
                  </label>
                </div>
                <div class="radio-inline">
                  <label>
                    <input type="radio" v-model="newTodo.priority" value="2">
                    Medium
                  </label>
                </div>
                <div class="radio-inline">
                  <label>
                    <input type="radio" v-model="newTodo.priority" value="1">
                    High
                  </label>
                </div>
              </div>

            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-default" @click="resetNew">Cancel</button>
            <button type="button" class="btn btn-primary" @click="saveTodo">Save</button>
          </div>
        </div><!-- /.modal-content -->
      </div><!-- /.modal-dialog -->
    </div><!-- /.modal -->
    <table class="table table-hover">
      <thead>
        <tr>
          <td style="max-width: 20px;" @dblclick="archiveDone()">✔</td>
          <td style="max-width: 20px;">!</td>
          <td>Task</td>
          <td>Project</td>
          <td>Area</td>
          <td>Due</td>
          <td v-if="status === 'scheduled'">Start</td>
          <td v-if="status === 'waiting'">Waiting on</td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="todo in visibleTodos()" :key="todo._id" @dblclick="editTodo(todo)">
          <td>
            <input class="toggle" type="checkbox" v-model="todo.completed" @change="reallySaveTodo(todo)" />
          </td>
          <td>{{ todo.priority }}</td>
          <td>{{ todo.title }}</td>
          <td>{{ todo.project_name }}</td>
          <td>{{ todo.area }}</td>
          <td>{{ relativeDate(todo.dueDate) }}</td>
          <td v-if="status === 'scheduled'">{{ relativeDate(todo.startDate) }}</td>
          <td v-if="status === 'waiting'">{{ todo.waiting_for }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
