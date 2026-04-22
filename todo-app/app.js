class TodoApp {
    constructor(storage) {
        this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
        this.storageKey = 'todo-app-todos'
        this.todos = this._load()
        this.filter = 'all'
    }

    _generateId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID()
        }
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    }

    _load() {
        if (!this.storage) return []
        try {
            var data = this.storage.getItem(this.storageKey)
            var parsed = data ? JSON.parse(data) : []
            if (!Array.isArray(parsed)) return []
            return parsed.filter(function (t) {
                return (
                    t &&
                    typeof t === 'object' &&
                    typeof t.id === 'string' &&
                    typeof t.text === 'string' &&
                    typeof t.completed === 'boolean'
                )
            })
        } catch (e) {
            return []
        }
    }

    _save() {
        if (!this.storage) return false
        try {
            this.storage.setItem(this.storageKey, JSON.stringify(this.todos))
            return true
        } catch (e) {
            return false
        }
    }

    addTodo(text) {
        var trimmed = typeof text === 'string' ? text.trim() : ''
        if (!trimmed) return null
        var todo = {
            id: this._generateId(),
            text: trimmed,
            completed: false,
            createdAt: new Date().toISOString()
        }
        this.todos.push(todo)
        this._save()
        return todo
    }

    toggleTodo(id) {
        var todo = this.todos.find(function (t) {
            return t.id === id
        })
        if (todo) {
            todo.completed = !todo.completed
            this._save()
        }
        return todo || null
    }

    deleteTodo(id) {
        var index = this.todos.findIndex(function (t) {
            return t.id === id
        })
        if (index !== -1) {
            var removed = this.todos.splice(index, 1)[0]
            this._save()
            return removed
        }
        return null
    }

    editTodo(id, newText) {
        var trimmed = typeof newText === 'string' ? newText.trim() : ''
        if (!trimmed) return null
        var todo = this.todos.find(function (t) {
            return t.id === id
        })
        if (todo) {
            todo.text = trimmed
            this._save()
        }
        return todo || null
    }

    clearCompleted() {
        this.todos = this.todos.filter(function (t) {
            return !t.completed
        })
        this._save()
    }

    getFilteredTodos(filter) {
        var f = filter || this.filter
        if (f === 'active') {
            return this.todos.filter(function (t) {
                return !t.completed
            })
        }
        if (f === 'completed') {
            return this.todos.filter(function (t) {
                return t.completed
            })
        }
        return this.todos.slice()
    }

    getActiveCount() {
        return this.todos.filter(function (t) {
            return !t.completed
        }).length
    }
}

function initApp() {
    var app = new TodoApp()

    var input = document.getElementById('todo-input')
    var addBtn = document.getElementById('add-btn')
    var todoList = document.getElementById('todo-list')
    var itemCount = document.getElementById('item-count')
    var clearCompletedBtn = document.getElementById('clear-completed-btn')
    var filterBtns = document.querySelectorAll('.filter-btn')

    function render() {
        var todos = app.getFilteredTodos()
        todoList.replaceChildren()

        todos.forEach(function (todo) {
            var li = document.createElement('li')
            li.className = 'todo-item' + (todo.completed ? ' completed' : '')
            li.dataset.id = todo.id

            var checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.checked = todo.completed
            checkbox.setAttribute('aria-label', 'Toggle ' + todo.text)
            checkbox.addEventListener('change', function () {
                app.toggleTodo(todo.id)
                render()
            })

            var span = document.createElement('span')
            span.className = 'todo-item-text'
            span.textContent = todo.text
            span.addEventListener('dblclick', function () {
                startEditing(li, todo)
            })

            var deleteBtn = document.createElement('button')
            deleteBtn.className = 'delete-btn'
            deleteBtn.textContent = '\u00d7'
            deleteBtn.setAttribute('aria-label', 'Delete ' + todo.text)
            deleteBtn.addEventListener('click', function () {
                app.deleteTodo(todo.id)
                render()
            })

            li.appendChild(checkbox)
            li.appendChild(span)
            li.appendChild(deleteBtn)
            todoList.appendChild(li)
        })

        var count = app.getActiveCount()
        itemCount.textContent = count === 1 ? '1 item left' : count + ' items left'
    }

    function startEditing(li, todo) {
        var existingInput = li.querySelector('.todo-item-edit')
        if (existingInput) return

        var span = li.querySelector('.todo-item-text')
        span.style.display = 'none'

        var editInput = document.createElement('input')
        editInput.type = 'text'
        editInput.className = 'todo-item-edit'
        editInput.value = todo.text
        editInput.setAttribute('aria-label', 'Edit todo')

        function finishEdit() {
            if (finishEdit.committed) return
            finishEdit.committed = true
            var newText = editInput.value.trim()
            if (newText) {
                app.editTodo(todo.id, newText)
            }
            render()
        }

        function cancelEdit() {
            render()
        }

        editInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                finishEdit()
            } else if (e.key === 'Escape') {
                cancelEdit()
            }
        })

        editInput.addEventListener('blur', function () {
            finishEdit()
        })

        li.insertBefore(editInput, li.querySelector('.delete-btn'))
        editInput.focus()
        editInput.setSelectionRange(editInput.value.length, editInput.value.length)
    }

    addBtn.addEventListener('click', function () {
        var text = input.value
        if (app.addTodo(text)) {
            input.value = ''
            render()
        }
    })

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            var text = input.value
            if (app.addTodo(text)) {
                input.value = ''
                render()
            }
        }
    })

    filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            filterBtns.forEach(function (b) {
                b.classList.remove('active')
                b.setAttribute('aria-pressed', 'false')
            })
            btn.classList.add('active')
            btn.setAttribute('aria-pressed', 'true')
            app.filter = btn.dataset.filter
            render()
        })
    })

    clearCompletedBtn.addEventListener('click', function () {
        app.clearCompleted()
        render()
    })

    render()
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initApp)
}

if (typeof module !== 'undefined') {
    module.exports = { TodoApp }
}
