import {fabric} from "fabric";


fabric.Object.prototype.addUndoState = function () {
    // Check if history is disabled
    if (this.history.disabled) {
        return;
    }

    // Get the old state (os) and the new state (ns)
    let os = this.history.state as {[key: string]: any}
    let ns = this.toObject();
    let ms: any = {};

    // Compare old and new states to find modified properties
    for (let prop in os) {
        if (JSON.stringify(os[prop]) !== JSON.stringify(ns[prop])) {
            ms[prop] = os[prop];
        }
    }

    // Add modified state to undo history
    if (Object.keys(ms).length > 0) {
        this.history.undo.push(ms);
        this.history.state = this.toObject();
        this.history.redo = [];
    }

    // Fire a history event
    this.canvas?.fire("history", {target: this});
}
fabric.Object.prototype.initUndo = function () {
    // Initialize history object and listen for 'modified' event
    this.history = {
        undo: [],
        redo: [],
        state: this.toObject()
    };
    this.on('modified', this.addUndoState);
}
fabric.Object.prototype.undo = function () {
    if (this.history?.undo.length) {
        this.history.disabled = true;

        // Get undo and redo history
        let undo = this.history.undo;
        let redo = this.history.redo;
        let undoState = undo.pop() as {[key: string]: any}

        // Compare current state (ns) with undo state to find modifications
        let ns = this.toObject();
        let ms: any = {};
        for (let prop in undoState) {
            if (JSON.stringify(undoState[prop]) !== JSON.stringify(ns[prop])) {
                ms[prop] = ns[prop];
            }
        }

        // Add modifications to redo history
        redo.push(ms);

        // Set the object to the undo state
        this.set(undoState);

        // Fire events and update history
        this.fire("modified");
        this.canvas?.fire("object:modified", {target: this});
        this.history.state = this.toObject();
        this.canvas?.renderAll();

        // Cleanup and fire history event
        delete this.history.disabled;
        this.canvas?.fire("history", {target: this});
    }
}
fabric.Object.prototype.disableHistory = function () {
    this.history.disabled = true;
}
fabric.Object.prototype.enableHistory = function () {
    this.history.disabled = false;
}
fabric.Object.prototype.redo = function () {
    if (this.history?.redo.length) {
        this.history.disabled = true;

        // Get undo and redo history
        let undo = this.history.undo;
        let redo = this.history.redo;
        let redoState = redo.pop() as {[key: string]: any}

        // Compare current state (ns) with redo state to find modifications
        let ns = this.toObject();
        let ms: any = {};
        for (let prop in redoState) {
            if (JSON.stringify(redoState[prop]) !== JSON.stringify(ns[prop])) {
                ms[prop] = ns[prop];
            }
        }

        // Add modifications to undo history
        undo.push(ms);

        // Set the object to the redo state
        this.set(redoState);

        // Fire events and update history
        this.fire("modified");
        this.canvas?.fire("object:modified", {target: this});
        this.canvas?.renderAll();
        delete this.history.disabled;
        this.canvas?.fire("history", {target: this});
    }
}
fabric.Object.prototype.undoable = function () {
    return this.history?.undo.length > 0;
}
fabric.Object.prototype.redoable = function () {
    return this.history?.redo.length > 0;
}


// Extend fabric.Object interface with UndoMixin methods
declare module "fabric" {
    namespace fabric {
        interface Object {
            history: {
                disabled?: boolean,
                undo: fabric.IObjectOptions[],
                redo: fabric.IObjectOptions[],
                state: fabric.IObjectOptions
            }
            
            disableHistory(): void;

            enableHistory(): void;

            addUndoState(): void;

            initUndo(): void;

            undo(): void;

            redo(): void;

            undoable(): boolean;

            redoable(): boolean;
        }
    }
}