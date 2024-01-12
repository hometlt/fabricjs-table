import {fabric} from "fabric";
import {IPoint} from "fabric/fabric-impl";


const connectionOwnProperties: string[] = []

const MIN_DISTANCE_ARROW = 2

/**
 * FabricJS Table Object
 */
class FabricConnection extends fabric.Line {
  orientation: string = "horizontal"

  source?: string
  target?: string
  _source?: fabric.Object
  _target?: fabric.Object

  _remove: ()=> void
  _update: ()=> void
  _checkIfWatchedObjectAddedInSelection: ()=> void

  getConnectionPoint(target: fabric.Object ,side: string): IPoint {

    let options = target.getAbsoluteProperties()

    let l = options.left!,
        t = options.top!,
        w = options.width! * options.scaleX!,
        h = options.height! * options.scaleY!

    switch (side) {
      case 'left':
        return {x: l, y: t + h / 2}
      case 'right':
        return {x: l + w, y: t + h / 2}
      case 'bottom':
        return {x: l + w / 2, y: t + h}
      case 'top':
        return {x: l + w / 2, y: t}
      default:
        return {x: l + w / 2, y: t + h / 2}
    }
  }

  updateLinePoints(){
    if(!this._source || ! this._target){
      return
    }
    let s = this._source
    let t = this._target
    //left , right, top, bottom

    let b1 = s.getAbsoluteProperties()

    let b2 = t.getAbsoluteProperties()

    let point1 : IPoint, point2 : IPoint, orientation: string
    if(b2.left - MIN_DISTANCE_ARROW > b1.left + b1.width){
      orientation = 'horizontal'
      point1 = this.getConnectionPoint(s,'right')
      point2 = this.getConnectionPoint(t,'left')
    }
    else if(b2.left + b2.width < b1.left - MIN_DISTANCE_ARROW) {
      orientation = 'horizontal'
      point1 = this.getConnectionPoint(s,'left')
      point2 = this.getConnectionPoint(t,'right')
    }
    else if(b2.top - MIN_DISTANCE_ARROW >  b1.top + b1.height){
      orientation = 'vertical'
      point1 = this.getConnectionPoint(s,'bottom')
      point2 = this.getConnectionPoint(t,'top')
    }
    else if(b2.top + b2.height < b1.top - MIN_DISTANCE_ARROW){
      orientation = 'vertical'
      point1 = this.getConnectionPoint(s,'top')
      point2 = this.getConnectionPoint(t,'bottom')
    }
    //inside
    else if(b2.left + b2.width/2 > b1.left + b1.width/2) {
      orientation = 'horizontal'
      point1 = this.getConnectionPoint(s,'right')
      point2 = this.getConnectionPoint(t,'left')
    }
    else {
      orientation = 'horizontal'
      point1 = this.getConnectionPoint(s,'left')
      point2 = this.getConnectionPoint(t,'right')
    }


    // @ts-ignore
    this.set({
      orientation,
      x1: point1.x,
      y1: point1.y ,
      x2: point2.x,
      y2: point2.y
    });
    this.setCoords()

    this.canvas.renderAll()
  }

  constructor(options: Partial<fabric.ConnectionOptions>) {
    super()
    this._update = ()=> this.updateLinePoints()
    this._checkIfWatchedObjectAddedInSelection = () => this.checkIfWatchedObjectAddedInSelection()
    this._remove = () => {
      this.canvas && this.canvas.remove(this)
    }

    // @ts-ignore
    fabric.Line.prototype.initialize.call(this,[0,0,0,0],options)

    if(options.source){
      this.setSource(options.source)
    }
    if(options.target){
      this.setTarget(options.target)
    }
    this.on("removed",this.unlink.bind(this))
  }
  unlink(){
    this._setTarget(null)
    this._setSource(null)

    if(this._watchingSelection) {
      this._watchingSelection = false
      this.canvas?.off({
        "selection:created": this._checkIfWatchedObjectAddedInSelection,
        "selection:updated": this._checkIfWatchedObjectAddedInSelection,
        "selection:cleared": this._checkIfWatchedObjectAddedInSelection
      })
    }
  }
  _watchingSelection: boolean
  _watchSelection(){
    if(this._watchingSelection){
      return
    }
    this._watchingSelection = true
    this.canvas.on({
      "selection:created": this._checkIfWatchedObjectAddedInSelection,
      "selection:updated": this._checkIfWatchedObjectAddedInSelection,
      "selection:cleared": this._checkIfWatchedObjectAddedInSelection
    })
  }

  _watchObject(object: fabric.Object){
    if(!object){
      return
    }
    object.on({
      removed: this._remove,
      moving: this._update,
      scaling: this._update,
      resizing: this._update
    })

    if(this.canvas) {
      this._watchSelection()
    }else{
      this.on("added",() => this._watchSelection())
    }
    if(object.group){
      object.group.on({
        removed: this._remove,
        moving: this._update,
        scaling: this._update,
        resizing: this._update
      })
      if(object.group.constructor === fabric.Table){
        let table = object.group as fabric.Table
        // @ts-ignore
        table.on("cells:merge", ({cell, merged, bounds}) => {
          if(merged.find(cell => cell.o === object)){
            this._remove()
          }
          else if(cell.o === object){
            this._update()
          }
        })
      }
    }
  }
  checkIfWatchedObjectAddedInSelection(){
    if(this.canvas._activeObject?.constructor === fabric.ActiveSelection){
      let selection = this.canvas._activeObject as fabric.ActiveSelection
      let shouldWatch = !!selection._objects.find(obj => this._target || this._source)
      if(shouldWatch){
        selection.on({
          moving: this._update,
          scaling: this._update,
          resizing: this._update
        })
      }
    }
  }
  _unwatchObject(object: fabric.Object){
    if(!object){
      return
    }
    object.off({
      "removed": this._remove,
      "moving": this._update,
      "scaling": this._update,
      "resizing": this._update
    })
  }
  _setSource(object: fabric.Object | null){
    if(this._source){
      this._unwatchObject(this._source)
      this._source._outputConections.splice(this._source._outputConections.indexOf(this),1)
      if(this._target?.id && this._source.connections){
        this._source.connections.splice(this._source.connections.indexOf(this._target.id),1)
      }
    }

    if(object){
      if(!object._outputConections){
        object._outputConections = []
      }
      object._outputConections.push(this)
      this._watchObject(object)
      this._source = object
    }
    else{
      delete this._source
    }
    this.updateLinePoints()
  }
  _setTarget(object: fabric.Object | null){
    if(this._target){
      this._unwatchObject(this._target)
      this._target._inputConections.splice(this._target._inputConections.indexOf(this),1)
      if(this._source?.connections && this._target.id){
        this._source.connections.splice(this._source.connections.indexOf(this._target.id),1)
      }
    }

    if(object) {
      if (!object._inputConections) {
        object._inputConections = []
      }
      object._inputConections.push(this)
      this._watchObject(object)
      this._target = object
    }
    else{
      delete this._target
    }
    this.updateLinePoints()
  }
  setSource(value: fabric.Object | string){
    if(value.constructor === String){
      this.source = value as string
      if(this.canvas){
        this._updateSource()
      }
      else{
        this.on("added",this._updateSource.bind(this))
      }
    }
    else{
      let object = value as fabric.Object
      this.source = object.getIDPath()

      this._setSource(value as fabric.Object)
    }
  }
  _updateTarget(){
    let object = this.canvas.getObjectByIDPath(this.target)
    object && this._setTarget(object)
  }
  _updateSource(){
    let object = this.canvas.getObjectByIDPath(this.source)
    object && this._setSource(object)
  }
  setTarget(value: fabric.Object | string){

    if(value.constructor === String){
      this.target = value as string
      if(this.canvas){
        this._updateTarget()
      }
      else{
        this.on("added",this._updateTarget.bind(this))
      }
    }
    else{
      let object = value as fabric.Object
      this.target = object.getIDPath()
      this._setTarget(object)
    }
    this.updateLinePoints()
  }

  // Convert object properties to be included
  override toObject(propertiesToInclude: string[] = []): fabric.IObjectOptions {
    return fabric.Object.prototype.toObject.call(this,[ ...connectionOwnProperties, ...propertiesToInclude]);
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  override _render (ctx: CanvasRenderingContext2D) {

    ctx.beginPath();

    let p = this.calcLinePoints();

    let isRounded = true;
    /* "magic number" for bezier approximations of arcs (http://itc.ktu.lt/itc354/Riskus354.pdf) */
    let k = 1 - 0.5522847498;

    let rx = isRounded ? 10 : 0, ry = isRounded ? 10 : 0
    let x = p.x1
    let y = p.y1
    let w = p.x2 - p.x1
    let w2 = w/2
    let h = p.y2 - p.y1
    let h2 = h/2
    let ymod = 1, xmod = 1


    rx = Math.abs(w/2);
    ry = Math.abs(h/2);
    // let mindist = Math.min(Math.abs(w) - 6,Math.abs(h) - 6)
    // if(mindist < 0){
    //   ry = rx = 0
    // }
    // else if (mindist < ry * 2){
    //   ry = rx = mindist/2
    // }

    ctx.beginPath();

    ctx.moveTo(p.x1, p.y1);

    switch(this.orientation){
      case "horizontal": {

        if(h< 0){
          ry = -ry
        }
        if(w< 0){
          rx = -rx
          xmod = -1
        }

        let arrowSize = Math.max(0,Math.min(this.cornerSize || 1,Math.abs(w)/2 - 4 ))

        ctx.lineTo(x + w2 - rx, y);
        isRounded && ctx.bezierCurveTo(x + w2 - k * rx , y, x + w2, y + k * ry , x + w2, y + ry );

        ctx.lineTo(x + w2, y + h - ry );
        isRounded && ctx.bezierCurveTo(x + w2, y + h - k * ry , x + w2 + k * rx, y + h, x + w2 + rx, y + h);

        ctx.lineTo(p.x2, p.y2);
        ctx.moveTo(p.x2, p.y2);
        ctx.lineTo(p.x2 - (arrowSize +0.5) * xmod, p.y2 - arrowSize);
        ctx.moveTo(p.x2, p.y2);
        ctx.lineTo(p.x2 - (arrowSize +0.5)  * xmod, p.y2 + arrowSize);
        break;
      }
      case "vertical": {

        if(w < 0){
          rx = -rx
        }
        if(h < 0){
          ry = -ry
          ymod = -1
        }
        let arrowSize = Math.max(0,Math.min(this.cornerSize || 1,Math.abs(h)/2 - 4 ))

        ctx.lineTo(x, y + h2 - ry);
        isRounded && ctx.bezierCurveTo(x, y + h2 - k * ry, x + k * rx, y + h2, x + rx, y + h2);

        ctx.lineTo(x + w - rx, y + h2);
        isRounded && ctx.bezierCurveTo(x + w - k * rx, y + h2, x + w, y + h2 + k * ry, x + w, y + h2 + ry);

        ctx.lineTo(p.x2, p.y2);
        ctx.moveTo(p.x2, p.y2);
        ctx.lineTo(p.x2 - arrowSize, p.y2 - (arrowSize +0.5) * ymod);
        ctx.moveTo(p.x2, p.y2);
        ctx.lineTo(p.x2 + arrowSize, p.y2 - (arrowSize +0.5) * ymod);
        break;
      }
      case "straight": {
        ctx.lineTo(p.x2, p.y2);
      }
    }

    ctx.lineWidth = this.strokeWidth || 0;

    let origStrokeStyle = ctx.strokeStyle;
    ctx.strokeStyle = this.stroke || ctx.fillStyle;
    this.stroke && this._renderStroke(ctx);
    ctx.strokeStyle = origStrokeStyle;
  }
}

FabricConnection.prototype.type = 'connection'
FabricConnection.prototype.fill = 'rgb(88,47,190)'
FabricConnection.prototype.stroke = 'rgb(88,47,190)'
FabricConnection.prototype.cornerColor = '#582fbe'
FabricConnection.prototype.cornerSize =  5
FabricConnection.prototype.strokeWidth = 2
FabricConnection.prototype.selectable = false
FabricConnection.prototype.evented = false

fabric.Canvas.prototype.getObjectByIDPath = function(value: string){

  let path = value.split(".")
  let id = path.shift()
  let object = this._objects.find(o=> o.id === id) || null
  id = path.shift()
  while(id && object) {
    let group = object as fabric.Group
    if(group._objects) {
      object = group._objects.find(o => o.id === id) || null
    }
    id = path.shift()
  }
  return object
}
fabric.Connection = FabricConnection

fabric.Object.prototype.disconnect = function (value?: string | fabric.Object){

  let target: string;
  if(value) {

    if(value.constructor === String){
      target = value as string
    }


    let object = value as fabric.Object
    target = object.getIDPath()

    let connection = this._outputConections?.find(el => el.target === target)
    if (connection.canvas) {
      connection.canvas.remove(connection)
    }

    connection = this._inputConections?.find(el => el.target === target)
    if (connection.canvas) {
      connection.canvas.remove(connection)
    }

  }
  else{
    if(this._outputConections){
      for(let connection of this._outputConections){
        connection.canvas.remove(connection)
      }
    }
    if(this._inputConections) {
      for (let connection of this._inputConections) {
        connection.canvas.remove(connection)
      }
    }
  }
}

fabric.Object.prototype.connect = function (target: string | fabric.Object){
  if(!target){
    return
  }
  if(!this.connections){
    this.connections = []
  }
  let id
  if(target.constructor === String){
    id = target
  }
  else{
    let object  = target as fabric.Object
    id = object.getIDPath()
  }
  this.connections.push(id)
  this.updateConnections()
}

fabric.Object.prototype.setConnections = function (value){
  this.connections = value
  this.updateConnections()
}

fabric.Object.prototype.updateConnections = function (){
  if(!this.connections){
    return
  }
  if(this.canvas){
    for(let connection of this.connections){
      let line = new fabric.Connection({
        source: this,
        target: connection,
        fill: 'red'
      })
      this.canvas?.add(line)
    }
  }
  else{
    this.on("added",this.updateConnections.bind(this))
  }
}

// Augment the fabric namespace to include Table
declare module "fabric" {
  export namespace fabric {

    /**
     * Additional Table Intilization properties
     */
    interface IObjectOptions {
      connections?: string[],
    }

    /**
     * Additional Table Intilization properties
     */
    export interface ConnectionOptions extends fabric.IObjectOptions {
      source: fabric.Object | string,
      target: fabric.Object | string,
    }

    interface Canvas{
      getObjectByIDPath(idPath: string) : fabric.Object | null
    }
    interface Object{
      connect: (target: string | fabric.Object) => void
      disconnect: (value?: string | fabric.Object | null) => void
      setConnections: (connections: string[]) => void
      _outputConections: fabric.Connection[]
      _inputConections: fabric.Connection[]
      updateConnections: ()=> void
    }
    class Connection extends FabricConnection {}
  }
}