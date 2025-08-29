/* Quadtree wrapper */
// this.quadtree: 
//   - quadtree-lib data structure (https://github.com/elbywan/quadtree-lib#readme) 
//   - elements in form {x, y, width, height, uuid, inTree}
// this.dirty:
//   - set of quadtree elements ({x, y, width, height, uuid, inTree})
// this.elements:
//   - dictionary of elements {uuid1: element1, uuid2: element2}
//   - these are the exact objects that go into this.quadtree by reference 
Wick.Quadtree = class {
    constructor(width, height) {
      this._quadtree = new Quadtree({
        width: width,
        height: height
      });
      this.dirty = new Set();
      this.elements = {};
    }
  
    get quadtree() {
      return this._quadtree;
    }
  
    clean() {
      let to_remove = [];
  
      this._quadtree.each(function (element) {
        let clip = Wick.ObjectCache.getObjectByUUID(element.uuid);
  
        if (!clip || !clip.onScreen) {
          to_remove.push(element);
          element.inTree = false;
        }
      });
  
      for (let i = 0; i < to_remove.length; i++) {
        this._quadtree.remove(to_remove[i]);
      }
    }
  
    resize(width, height) {
      this._quadtree.each(function (element) {
        element.inTree = false;
        this.dirty.add(element.uuid);
      });
  
      this._quadtree = new Quadtree({
        width: width,
        height: height
      });
    }
  
  };