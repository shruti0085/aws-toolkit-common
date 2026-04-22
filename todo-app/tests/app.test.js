var { describe, it, beforeEach } = require('node:test')
var assert = require('node:assert')
var { TodoApp } = require('../app.js')

function createMockStorage() {
    var store = {}
    return {
        getItem: function (key) {
            return key in store ? store[key] : null
        },
        setItem: function (key, value) {
            store[key] = String(value)
        },
        removeItem: function (key) {
            delete store[key]
        },
        clear: function () {
            store = {}
        },
        _store: store
    }
}

describe('TodoApp', function () {
    var app
    var storage

    beforeEach(function () {
        storage = createMockStorage()
        app = new TodoApp(storage)
    })

    describe('addTodo', function () {
        it('should add a todo with the given text', function () {
            var todo = app.addTodo('Buy groceries')
            assert.ok(todo)
            assert.strictEqual(todo.text, 'Buy groceries')
            assert.strictEqual(todo.completed, false)
            assert.ok(todo.id)
            assert.ok(todo.createdAt)
            assert.strictEqual(app.todos.length, 1)
        })

        it('should trim whitespace from text', function () {
            var todo = app.addTodo('  Hello world  ')
            assert.strictEqual(todo.text, 'Hello world')
        })

        it('should return null for empty text', function () {
            var result = app.addTodo('')
            assert.strictEqual(result, null)
            assert.strictEqual(app.todos.length, 0)
        })

        it('should return null for whitespace-only text', function () {
            var result = app.addTodo('   ')
            assert.strictEqual(result, null)
            assert.strictEqual(app.todos.length, 0)
        })

        it('should return null for non-string input', function () {
            var result = app.addTodo(null)
            assert.strictEqual(result, null)
            assert.strictEqual(app.todos.length, 0)
        })

        it('should handle special characters in text', function () {
            var todo = app.addTodo('<script>alert("xss")</script>')
            assert.ok(todo)
            assert.strictEqual(todo.text, '<script>alert("xss")</script>')
        })

        it('should handle unicode and emoji in text', function () {
            var todo = app.addTodo('Buy milk \u2615')
            assert.ok(todo)
            assert.strictEqual(todo.text, 'Buy milk \u2615')
        })

        it('should generate unique ids for each todo', function () {
            var todo1 = app.addTodo('First')
            var todo2 = app.addTodo('Second')
            assert.notStrictEqual(todo1.id, todo2.id)
        })

        it('should use crypto.randomUUID when available', function () {
            var todo = app.addTodo('UUID test')
            var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
            assert.ok(uuidPattern.test(todo.id), 'Expected UUID format, got: ' + todo.id)
        })

        it('should persist to storage after adding', function () {
            app.addTodo('Persisted todo')
            var stored = JSON.parse(storage.getItem('todo-app-todos'))
            assert.strictEqual(stored.length, 1)
            assert.strictEqual(stored[0].text, 'Persisted todo')
        })
    })

    describe('toggleTodo', function () {
        it('should toggle a todo from active to completed', function () {
            var todo = app.addTodo('Toggle me')
            var toggled = app.toggleTodo(todo.id)
            assert.strictEqual(toggled.completed, true)
        })

        it('should toggle a todo from completed back to active', function () {
            var todo = app.addTodo('Toggle me')
            app.toggleTodo(todo.id)
            var toggled = app.toggleTodo(todo.id)
            assert.strictEqual(toggled.completed, false)
        })

        it('should return null for non-existent id', function () {
            var result = app.toggleTodo('nonexistent')
            assert.strictEqual(result, null)
        })

        it('should persist after toggling', function () {
            var todo = app.addTodo('Toggle persist')
            app.toggleTodo(todo.id)
            var stored = JSON.parse(storage.getItem('todo-app-todos'))
            assert.strictEqual(stored[0].completed, true)
        })
    })

    describe('deleteTodo', function () {
        it('should delete a todo by id', function () {
            var todo = app.addTodo('Delete me')
            var deleted = app.deleteTodo(todo.id)
            assert.strictEqual(deleted.text, 'Delete me')
            assert.strictEqual(app.todos.length, 0)
        })

        it('should return null for non-existent id', function () {
            var result = app.deleteTodo('nonexistent')
            assert.strictEqual(result, null)
        })

        it('should only delete the specified todo', function () {
            var todo1 = app.addTodo('Keep me')
            var todo2 = app.addTodo('Delete me')
            app.deleteTodo(todo2.id)
            assert.strictEqual(app.todos.length, 1)
            assert.strictEqual(app.todos[0].id, todo1.id)
        })

        it('should persist after deleting', function () {
            var todo = app.addTodo('Delete persist')
            app.deleteTodo(todo.id)
            var stored = JSON.parse(storage.getItem('todo-app-todos'))
            assert.strictEqual(stored.length, 0)
        })
    })

    describe('editTodo', function () {
        it('should edit the text of a todo', function () {
            var todo = app.addTodo('Original')
            var edited = app.editTodo(todo.id, 'Updated')
            assert.strictEqual(edited.text, 'Updated')
        })

        it('should trim the new text', function () {
            var todo = app.addTodo('Original')
            var edited = app.editTodo(todo.id, '  Trimmed  ')
            assert.strictEqual(edited.text, 'Trimmed')
        })

        it('should return null for empty new text', function () {
            var todo = app.addTodo('Original')
            var result = app.editTodo(todo.id, '')
            assert.strictEqual(result, null)
            assert.strictEqual(app.todos[0].text, 'Original')
        })

        it('should return null for whitespace-only new text', function () {
            var todo = app.addTodo('Original')
            var result = app.editTodo(todo.id, '   ')
            assert.strictEqual(result, null)
            assert.strictEqual(app.todos[0].text, 'Original')
        })

        it('should return null for non-existent id', function () {
            var result = app.editTodo('nonexistent', 'New text')
            assert.strictEqual(result, null)
        })

        it('should persist after editing', function () {
            var todo = app.addTodo('Edit persist')
            app.editTodo(todo.id, 'Edited')
            var stored = JSON.parse(storage.getItem('todo-app-todos'))
            assert.strictEqual(stored[0].text, 'Edited')
        })
    })

    describe('clearCompleted', function () {
        it('should remove all completed todos', function () {
            var todo1 = app.addTodo('Active')
            var todo2 = app.addTodo('Completed')
            app.toggleTodo(todo2.id)
            app.clearCompleted()
            assert.strictEqual(app.todos.length, 1)
            assert.strictEqual(app.todos[0].id, todo1.id)
        })

        it('should do nothing when no todos are completed', function () {
            app.addTodo('Active 1')
            app.addTodo('Active 2')
            app.clearCompleted()
            assert.strictEqual(app.todos.length, 2)
        })

        it('should remove all todos when all are completed', function () {
            var todo1 = app.addTodo('Done 1')
            var todo2 = app.addTodo('Done 2')
            app.toggleTodo(todo1.id)
            app.toggleTodo(todo2.id)
            app.clearCompleted()
            assert.strictEqual(app.todos.length, 0)
        })

        it('should persist after clearing', function () {
            var todo = app.addTodo('Clear persist')
            app.toggleTodo(todo.id)
            app.clearCompleted()
            var stored = JSON.parse(storage.getItem('todo-app-todos'))
            assert.strictEqual(stored.length, 0)
        })
    })

    describe('getFilteredTodos', function () {
        beforeEach(function () {
            var todo1 = app.addTodo('Active todo')
            var todo2 = app.addTodo('Completed todo')
            app.toggleTodo(todo2.id)
        })

        it('should return all todos with "all" filter', function () {
            var todos = app.getFilteredTodos('all')
            assert.strictEqual(todos.length, 2)
        })

        it('should return only active todos with "active" filter', function () {
            var todos = app.getFilteredTodos('active')
            assert.strictEqual(todos.length, 1)
            assert.strictEqual(todos[0].text, 'Active todo')
        })

        it('should return only completed todos with "completed" filter', function () {
            var todos = app.getFilteredTodos('completed')
            assert.strictEqual(todos.length, 1)
            assert.strictEqual(todos[0].text, 'Completed todo')
        })

        it('should use the instance filter when no argument is passed', function () {
            app.filter = 'active'
            var todos = app.getFilteredTodos()
            assert.strictEqual(todos.length, 1)
            assert.strictEqual(todos[0].completed, false)
        })

        it('should return a copy of the array, not the original', function () {
            var todos = app.getFilteredTodos('all')
            todos.push({ id: 'fake', text: 'Fake', completed: false })
            assert.strictEqual(app.todos.length, 2)
        })
    })

    describe('getActiveCount', function () {
        it('should return 0 when there are no todos', function () {
            assert.strictEqual(app.getActiveCount(), 0)
        })

        it('should return the count of active todos', function () {
            var todo1 = app.addTodo('Active')
            var todo2 = app.addTodo('Completed')
            app.toggleTodo(todo2.id)
            assert.strictEqual(app.getActiveCount(), 1)
        })

        it('should return 0 when all todos are completed', function () {
            var todo1 = app.addTodo('Done 1')
            var todo2 = app.addTodo('Done 2')
            app.toggleTodo(todo1.id)
            app.toggleTodo(todo2.id)
            assert.strictEqual(app.getActiveCount(), 0)
        })
    })

    describe('persistence', function () {
        it('should load todos from storage on init', function () {
            var existingTodos = [
                { id: 'abc', text: 'Existing', completed: false, createdAt: '2024-01-01T00:00:00.000Z' }
            ]
            storage.setItem('todo-app-todos', JSON.stringify(existingTodos))
            var newApp = new TodoApp(storage)
            assert.strictEqual(newApp.todos.length, 1)
            assert.strictEqual(newApp.todos[0].text, 'Existing')
        })

        it('should handle corrupted storage data gracefully', function () {
            storage.setItem('todo-app-todos', 'not valid json{{{')
            var newApp = new TodoApp(storage)
            assert.strictEqual(newApp.todos.length, 0)
        })

        it('should handle missing storage gracefully', function () {
            var noStorageApp = new TodoApp(null)
            assert.strictEqual(noStorageApp.todos.length, 0)
            var todo = noStorageApp.addTodo('No storage')
            assert.ok(todo)
        })

        it('should save and reload state correctly', function () {
            app.addTodo('First')
            app.addTodo('Second')
            var todo3 = app.addTodo('Third')
            app.toggleTodo(todo3.id)

            var reloadedApp = new TodoApp(storage)
            assert.strictEqual(reloadedApp.todos.length, 3)
            assert.strictEqual(reloadedApp.todos[2].completed, true)
        })

        it('should filter out entries with missing id', function () {
            var data = [
                { text: 'No id', completed: false, createdAt: '2024-01-01T00:00:00.000Z' },
                { id: 'valid', text: 'Has id', completed: false, createdAt: '2024-01-01T00:00:00.000Z' }
            ]
            storage.setItem('todo-app-todos', JSON.stringify(data))
            var newApp = new TodoApp(storage)
            assert.strictEqual(newApp.todos.length, 1)
            assert.strictEqual(newApp.todos[0].id, 'valid')
        })

        it('should filter out entries with non-string id', function () {
            var data = [
                { id: 123, text: 'Numeric id', completed: false, createdAt: '2024-01-01T00:00:00.000Z' }
            ]
            storage.setItem('todo-app-todos', JSON.stringify(data))
            var newApp = new TodoApp(storage)
            assert.strictEqual(newApp.todos.length, 0)
        })

        it('should filter out entries with missing text', function () {
            var data = [{ id: 'abc', completed: false, createdAt: '2024-01-01T00:00:00.000Z' }]
            storage.setItem('todo-app-todos', JSON.stringify(data))
            var newApp = new TodoApp(storage)
            assert.strictEqual(newApp.todos.length, 0)
        })

        it('should filter out entries with non-boolean completed', function () {
            var data = [{ id: 'abc', text: 'Bad completed', completed: 'yes', createdAt: '2024-01-01T00:00:00.000Z' }]
            storage.setItem('todo-app-todos', JSON.stringify(data))
            var newApp = new TodoApp(storage)
            assert.strictEqual(newApp.todos.length, 0)
        })

        it('should filter out null entries in the array', function () {
            var data = [null, { id: 'valid', text: 'Good', completed: true, createdAt: '2024-01-01T00:00:00.000Z' }]
            storage.setItem('todo-app-todos', JSON.stringify(data))
            var newApp = new TodoApp(storage)
            assert.strictEqual(newApp.todos.length, 1)
            assert.strictEqual(newApp.todos[0].id, 'valid')
        })

        it('should return empty array when storage contains a non-array', function () {
            storage.setItem('todo-app-todos', JSON.stringify({ not: 'an array' }))
            var newApp = new TodoApp(storage)
            assert.strictEqual(newApp.todos.length, 0)
        })

        it('should return true from _save on success', function () {
            app.addTodo('Test save')
            var result = app._save()
            assert.strictEqual(result, true)
        })

        it('should return false from _save when storage is null', function () {
            var noStorageApp = new TodoApp(null)
            noStorageApp.addTodo('No storage')
            var result = noStorageApp._save()
            assert.strictEqual(result, false)
        })

        it('should return false from _save when storage throws', function () {
            var failingStorage = createMockStorage()
            failingStorage.setItem = function () {
                throw new Error('QuotaExceededError')
            }
            var failApp = new TodoApp(failingStorage)
            failApp.todos = [{ id: 'a', text: 'Test', completed: false, createdAt: '2024-01-01T00:00:00.000Z' }]
            var result = failApp._save()
            assert.strictEqual(result, false)
        })
    })

    describe('edge cases', function () {
        it('should handle adding many todos', function () {
            for (var i = 0; i < 100; i++) {
                app.addTodo('Todo ' + i)
            }
            assert.strictEqual(app.todos.length, 100)
        })

        it('should handle special characters in todo text', function () {
            var todo = app.addTodo('Use "quotes" & <tags> and \'apostrophes\'')
            assert.ok(todo)
            assert.strictEqual(todo.text, 'Use "quotes" & <tags> and \'apostrophes\'')
        })

        it('should handle very long text', function () {
            var longText = 'a'.repeat(1000)
            var todo = app.addTodo(longText)
            assert.ok(todo)
            assert.strictEqual(todo.text.length, 1000)
        })

        it('should handle rapid add and delete operations', function () {
            var ids = []
            for (var i = 0; i < 10; i++) {
                var todo = app.addTodo('Rapid ' + i)
                ids.push(todo.id)
            }
            for (var j = 0; j < ids.length; j += 2) {
                app.deleteTodo(ids[j])
            }
            assert.strictEqual(app.todos.length, 5)
        })

        it('should handle toggling the same todo multiple times', function () {
            var todo = app.addTodo('Toggle many')
            for (var i = 0; i < 10; i++) {
                app.toggleTodo(todo.id)
            }
            assert.strictEqual(todo.completed, false)
        })
    })
})
