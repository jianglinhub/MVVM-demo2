function MVVM(options = {}) {
  this.$options = options
  let data = this._data = this.$options.data
  observe(data)
  for (let key in data) {
    Object.defineProperty(this, key, {
      enumerable: true,
      get() {
        return this._data[key]
      },
      set(newVal) {
        this._data[key] = newVal
      }
    })
  }
  initComputed.call(this)
  new Compile(options.el, this)
}

function initComputed() {
  let vm = this
  let computed = this.$options.computed
  Object.keys(computed).forEach(key => {
    Object.defineProperty(vm, key, {
      get: typeof computed[key] === 'function' ? computed[key] : computed[key].get,
    })
  })  
}

function Compile(el, vm) {
  vm.$el = document.querySelector(el)
  let fragment = document.createDocumentFragment()
  while (child = vm.$el.firstChild) {
    fragment.appendChild(child)
  }
  replace(fragment)
  function replace(fragment) {
    Array.from(fragment.childNodes).forEach(node => {
      let text = node.textContent
      let reg = /\{\{(.*)\}\}/
      if (node.nodeType === 3 && reg.test(text)) {
        let arr = RegExp.$1.split('.') // [a, a] [b]
        let val = vm
        arr.forEach(k => { // this.a.a this.b
          val = val[k]
        })
        new Watcher(vm, RegExp.$1, function (newVal) {
          node.textContent = text.replace(/\{\{(.*)\}\}/, newVal)  
        })
        node.textContent = text.replace(/\{\{(.*)\}\}/, val)
      }
      if (node.nodeType === 1) {
        let nodeAttrs = node.attributes
        Array.from(nodeAttrs).forEach(attr => {
          let name = attr.name // type = "text"
          let exp = attr.value // v-model = "b"
          if (name.indexOf('v-') === 0) {
            node.value = vm[exp]
          }
          new Watcher(vm, exp, function (newVal) {
            node.value = newVal
          })
          node.addEventListener('input', e => {
            let newVal = e.target.value
            vm[exp] = newVal
          })
        })
      }
      if (node.childNodes) {
        replace(node)
      }
    })
  }
  vm.$el.appendChild(fragment)
}

function observe(data) {
  if (typeof data !== 'object') return
  return new Observe(data)
}

function Observe(data) {
  let dep = new Dep()
  for (let key in data) {
    let val = data[key]
    observe(val)
    Object.defineProperty(data, key, {
      enumerable: true,
      get() {
        Dep.target && dep.addSub(Dep.target)
        return val
      },
      set(newVal) {
        if (newVal === val) {
          return
        }
        val = newVal
        observe(newVal)
        dep.notify()
      }
    })
  }
}

function Dep() {
  this.subs = []
}

Dep.prototype.addSub = function (sub) {
  this.subs.push(sub)
}

Dep.prototype.notify = function () {
  this.subs.forEach(sub => sub.update())
}

function Watcher(vm, exp, fn) {
  this.fn = fn
  this.vm = vm
  this.exp = exp
  Dep.target = this
  let val = vm
  let arr = exp.split('.')
  arr.forEach(k => {
    val = val[k]
  })
  Dep.target = null
}

Watcher.prototype.update = function () {
  let val = this.vm
  let arr = this.exp.split('.')
  arr.forEach(k => {
    val = val[k]
  })
  this.fn(val)
}