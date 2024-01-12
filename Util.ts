import {fabric} from "fabric";

// Extend fabric.util with custom functions

// Check if the transformation is centered at the origin
fabric.util.isTransformCentered = function (transform: fabric.Transform) {
    // @ts-ignore
    return transform.originX === 'center' && transform.originY === 'center';
}

// Get the local point based on the transformation
fabric.util.getLocalPoint = function (transform: fabric.Transform, originX: string, originY: string, x: number, y: number) {

    let target = transform.target,
        control = target.controls[transform.corner],
        zoom = target.canvas!.getZoom(),
        padding = target.padding! / zoom,
        localPoint = target.toLocalPoint(new fabric.Point(x, y), originX, originY);
    if (localPoint.x >= padding) {
        localPoint.x -= padding;
    }
    if (localPoint.x <= -padding) {
        localPoint.x += padding;
    }
    if (localPoint.y >= padding) {
        localPoint.y -= padding;
    }
    if (localPoint.y <= padding) {
        localPoint.y += padding;
    }
    localPoint.x -= control.offsetX
    localPoint.y -= control.offsetY
    return localPoint
}

// Fire a custom event with additional options
fabric.util.fireEvent = function (eventName: string, options: any) {
    let target = options.transform.target,
        canvas = target.canvas,
        canvasOptions = fabric.util.object.clone(options);
    canvasOptions.target = target;
    canvas && canvas.fire('object:' + eventName, canvasOptions);
    target.fire(eventName, options);
}

// Create common event information
fabric.util.commonEventInfo = function (eventData:Event, transform: fabric.Transform, x: number, y: number) {
    return {
        e: eventData,
        transform: transform,
        pointer: {
            x: x,
            y: y,
        }
    };
}

// Wrap an action handler with a custom event firing logic
fabric.util.wrapWithFireEvent = function (eventName: string, actionHandler: Function) {
    return function(eventData:Event, transform: fabric.Transform, x: number, y: number) {
        let actionPerformed = actionHandler(eventData, transform, x, y);
        if (actionPerformed) {
            fabric.util.fireEvent(eventName, fabric.util.commonEventInfo(eventData, transform, x, y));
        }
        return actionPerformed;
    };
}

// Wrap an action handler with fixed anchor logic
fabric.util.wrapWithFixedAnchor = function (actionHandler: Function) {
    return function(eventData:Event, transform: fabric.Transform, x: number, y: number) {
        let target = transform.target, centerPoint = target.getCenterPoint(),
            constraint = target.translateToOriginPoint(centerPoint, transform.originX, transform.originY),
            actionPerformed = actionHandler(eventData, transform, x, y);
        target.setPositionByOrigin(constraint, transform.originX, transform.originY);
        return actionPerformed;
    };
}

// Change the size of the target object
fabric.util.changeSize = function(eventData: Event, transform: fabric.Transform, x: number, y: number) {
    let target = transform.target,
        strokeWidth = target.strokeWidth || 0,
        localPoint = fabric.util.getLocalPoint(transform, transform.originX, transform.originY, x, y),
        strokePaddingX = strokeWidth / (target.strokeUniform ? target.scaleX! : 1),
        strokePaddingY = strokeWidth / (target.strokeUniform ? target.scaleY! : 1),
        multiplier = fabric.util.isTransformCentered(transform) ? 2 : 1,
        oldWidth = target.width,
        newWidth = Math.abs(localPoint.x * multiplier / target.scaleX!) - strokePaddingX,
        oldHeight = target.height,
        newHeight = Math.abs(localPoint.y * multiplier / target.scaleY!) - strokePaddingY;
    target.set('width', Math.max(newWidth, 0));
    target.set('height', Math.max(newHeight, 0));
    return oldWidth !== newWidth || oldHeight !== newHeight;
}

// Wrap the changeSize function with custom event handling and fixed anchor logic
fabric.controlsUtils.changeSize = fabric.util.wrapWithFireEvent('resizing', fabric.util.wrapWithFixedAnchor(fabric.util.changeSize));

// Extend the fabric namespace with missing declarations
declare module "fabric" {

    namespace fabric {

        // Extend IObservable interface with on method
        interface IObservable<T> {
            on(events: { [key: string]: (e: fabric.IEvent) => void }): void;
        }

        // Extend Object interface with additional properties
        interface Object {
            _cacheContext: CanvasRenderingContext2D
            _cacheCanvas: HTMLCanvasElement
            callSuper: any
        }

        // Extend Canvas interface with additional properties
        interface Canvas {
            _currentTransform?: fabric.Transform
        }

        // Extend Transform interface with gestureScale property
        interface Transform {
            gestureScale: number;
        }

        // Extend IUtil interface with custom functions
        interface IUtil {
            fireEvent: (eventName: string, options: any) => void
            commonEventInfo: (eventData: Event, transform: fabric.Transform, x: number, y: number) => void
            wrapWithFireEvent: (eventName: string, actionHandler: Function) => (eventData: Event, transform: fabric.Transform, x: number, y: number) => boolean
            wrapWithFixedAnchor: (actionHandler: Function) => Function
            getLocalPoint: (transform: fabric.Transform, originX: string, originY: string, x: number, y: number) => Point
            isTransformCentered: (transform: fabric.Transform) => boolean
            changeSize: (eventData: Event, transform: fabric.Transform, x: number, y: number) => boolean
            cos: (value: number) => number
            sin: (value: number) => number
        }

        // Extend IControlsUtils interface with custom controls
        interface IControlsUtils {
            changeSize: (eventData: MouseEvent, transformData: fabric.Transform, x: number, y: number) => boolean
        }

        // Provide controlsUtils with IControlsUtils interface
        const controlsUtils: IControlsUtils
    }
}