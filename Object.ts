import {fabric} from "fabric";

fabric.Object.prototype.getIDPath = function (){
    let result = this.group ? this.group.getIDPath () + "." : ""
    if(!this.id){
        this.id = this.type! + Date.now()
    }
    return result + this.id
}
fabric.Object.prototype._setOptions =
fabric.Object.prototype._setObject = function (options: any) {
        let properties = Object.keys(options)
        for (let prop in options) {
            if (!this.propertyApplyOrder?.includes(prop)) {
                this._set(prop, options[prop]);
            }
        }
        if (this.propertyApplyOrder) {
            for (let prop of this.propertyApplyOrder) {
                if (properties.includes(prop)) {
                    this._set(prop, options[prop]);
                }
            }
        }
    }

// @ts-ignore
fabric.Object.prototype.set = function (key: any, value: any) {
    if (typeof key === 'object') {
        this._setObject(key);
        if (this.onSet && !this._currentlySetProperties) {
            this._currentlySetProperties = true
            this.onSet(key)
            delete this._currentlySetProperties
        }
    } else {
        this._set(key, value);
        if (this.onSet && !this._currentlySetProperties) {
            this._currentlySetProperties = true
            this.onSet({[key]: value})
            delete this._currentlySetProperties
        }
    }
    return this;
}

fabric.Object.prototype.getAbsoluteProperties = function () {
    var matrix = this.calcTransformMatrix(),
        options = fabric.util.qrDecompose(matrix),
        center = new fabric.Point(options.translateX, options.translateY),
        center2 = this.translateToCenterPoint(center, 'center', 'center'),
        position = this.translateToOriginPoint(center2, this.originX, this.originY);

    return {
        width: this.width,
        height: this.height,
        left: position.x,
        top: position.y,
        angle: options.angle,
        scaleX: options.scaleX,
        scaleY: options.scaleY
    }
}
fabric.Object.prototype.getAbsoluteCoordinates = function () {

    let options = this.getAbsoluteProperties()
    // @ts-ignore
    if(!this.canvas._hackrect){
        // @ts-ignore
        this.canvas._hackrect = new fabric.Rect({})
    }
    // @ts-ignore
    this.canvas._hackrect.set(options)
    // @ts-ignore
    return this.canvas._hackrect.getCoords(true,true)
}
fabric.Object.prototype.setOptions = function (options: any) {
    this._setOptions(options);
    if (this.onSet && !this._currentlySetProperties) {
        this._currentlySetProperties = true
        this.onSet(options)
        delete this._currentlySetProperties
    }
    this._initGradient(options.fill, 'fill');
    this._initGradient(options.stroke, 'stroke');
    this._initPattern(options.fill, 'fill');
    this._initPattern(options.stroke, 'stroke');
}
fabric.Object.prototype._set = function (key: string, value: any) {
    let shouldConstrainValue = (key === 'scaleX' || key === 'scaleY');
    // @ts-ignore
    let isChanged = this[key] !== value, groupNeedsUpdate = false;

    if (shouldConstrainValue) {
        value = this._constrainScale(value);
    }
    if (key === 'scaleX' && value < 0) {
        this.flipX = !this.flipX;
        value *= -1;
    } else if (key === 'scaleY' && value < 0) {
        this.flipY = !this.flipY;
        value *= -1;
    } else if (key === 'shadow' && value && !(value instanceof fabric.Shadow)) {
        value = new fabric.Shadow(value);
    } else if (key === 'dirty' && this.group) {
        this.group.set('dirty', value);
    }

    let setter = '__set' + key
    // @ts-ignore
    if (this[setter]) {
        // @ts-ignore
        this[setter](value)
    } else {
        // @ts-ignore
        this[key] = value;
    }

    if (isChanged) {
        groupNeedsUpdate = this.group && this.group.isOnACache() || false;
        if (this.cacheProperties!.indexOf(key) > -1) {
            this.dirty = true;
            groupNeedsUpdate && this.group!.set('dirty', true);
        } else if (groupNeedsUpdate && this.stateProperties!.indexOf(key) > -1) {
            this.group!.set('dirty', true);
        }
    }
    return this;
}
fabric.Object.prototype.toDatalessObject = function (propertiesToInclude: string[]) {
    let object = this.toObject(propertiesToInclude)
    delete object["version"]
    let defaults = this.getDefaultProperties()
    for (let property in object) {
        if (property === "type") {
            continue
        }
        if (defaults[property]) {
            if (object[property] === defaults[property]) {
                delete object[property]
            }
        } else {
            // @ts-ignore
            if (object[property] === fabric.Rect.prototype[property]) {
                delete object[property]
            }
        }
    }
    if(this.id){
        object.id = this.id
    }
    return object
}
fabric.Object.prototype.defaultProperties = {}
fabric.Object.prototype.getDefaultProperties = function () {
    return this.defaultProperties || {}
}

/**
 * Augment declarations to add custom methods to fabric.Canvas interface
 */
declare module "fabric" {
    namespace fabric {

        type Class = (options: any) => fabric.Object;

        interface IObjectOptions {
            id?: string
            subTargetCheck?: boolean
        }

        interface Object {
            id?: string

            // type: string
            // left: number
            // top: number
            // width: number
            // height: number
            // angle: number
            // scaleX: number
            // scaleY: number
            // stateProperties: string[]
            // cacheProperties: string[]
            // group: fabric.Group
            // padding: number;

            _currentlySetProperties?:boolean
            propertyApplyOrder?: string[]
            getDefaultProperties() : {[key: string]: any}
            defaultProperties:  {[key: string]: any}

            group?: fabric.Group
            set(options?: any): void;

            onSet(options: {
                [key: string]: any
            }): void

            getIDPath () : string

            _setObject(options: any): void

            _setOptions(options: any): void

            _initGradient(options: any, property: string): void

            _initPattern(options: any, property: string): void

            _constrainScale(value: number): void

            getAbsoluteProperties(): fabric.IObjectOptions
            getAbsoluteCoordinates(): [fabric.Point, fabric.Point, fabric.Point, fabric.Point]
        }
    }
}