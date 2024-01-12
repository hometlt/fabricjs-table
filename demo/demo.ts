import {createWorker} from "tesseract.js";
import {fabric} from "fabric";
import "../index";

// Constant for OCR padding around table cells
const TABLE_OCR_PADDING = -3;

// Options for the demo
interface DemoOptions {
    imageSrc?: string;
}

// Structure of the table annotation
interface Annotation {
    bbox: { x: number; y: number }[];
    column_headers: number;
    row_headers: number;
    cells: {
        row: number;
        col: number;
        row_span: number;
        col_span: number;
        words: string;
        bbox: { x: number; y: number }[];
        is_row_header: boolean;
        is_col_header: boolean;
    }[];
}

Object.assign(fabric.Rect.prototype,{
    transparentCorners: false,
    originX: 'left',
    originY: 'top',
    stroke: '#582fbe',
    strokeWidth: 2,
    fill: 'rgba(88,47,190,0.2)',
    cornerSize:  8,
    lockRotation:  true,
    strokeUniform:  true,
    cornerColor:  '#582fbe',
})

class Demo {
    // Fabric canvas for drawing
    fabricCanvas: fabric.Canvas;
    // HTML canvas element
    canvasEl: HTMLCanvasElement;
    // Wrapper element
    wrapperEl: HTMLElement;
    // Wrapper menu element
    wrapperMenuEl: HTMLElement;
    // Buttons menu element
    buttonsMenuEl: HTMLElement;
    // Context menu element
    contextMenuEl: HTMLElement;
    // Close dialog button element
    closeDialogButton: HTMLElement;
    // Results dialog element
    resultsDialogEl: HTMLDialogElement;
    // Result container element
    resultContainerEl: HTMLElement;
    // Table properties for fabric.Table
    tableProperties: fabric.TableOptions = {
        strokeWidth: 2,
        cornerSize: 8,
        lockRotation: true,
        // ... other properties ...
    };
    // Counter for the number of tables
    _tables: number = 0;
    constructor(options: DemoOptions) {
        this.wrapperMenuEl = document.getElementById("wrapper-menu") as HTMLElement
        this.wrapperEl = document.getElementById("wrapper") as HTMLElement
        this.closeDialogButton = document.getElementById("close-dialog") as HTMLElement
        this.resultsDialogEl = document.getElementById("result-dialog") as HTMLDialogElement
        this.resultContainerEl = document.getElementById("result-container") as HTMLElement
        this.buttonsMenuEl = document.getElementById("buttons-menu") as HTMLElement
        this.contextMenuEl = document.getElementById("context-menu") as HTMLElement

        this.canvasEl = document.createElement("canvas");
        this.canvasEl.classList.add("my-container");
        this.wrapperEl.appendChild(this.canvasEl);

        this.fabricCanvas = new fabric.Canvas(this.canvasEl);
        this.fabricCanvas.setStretchable(true)
        this.fabricCanvas.setMouseWheelZoom(true)

        if(options.imageSrc){
            this.fabricCanvas.setBackgroundImage(options.imageSrc,
                (image: HTMLImageElement)=>{
                    if(image){
                        this.fabricCanvas.setOriginalSize(image)

                        this.fabricCanvas.createScrollbars();

                        this.fabricCanvas.centerAndZoomOut();
                    }
                }
            );
        }

        this.makeDemoTable()
        this.makeContextMenu();
        this.canvasSelectZoomMenu();
        this.makeMainMenu();
        this.makeResultsDialog();

        // Disable uniform scaling for the fabric canvas
        this.fabricCanvas.uniformScaling = false;

        this.debugSelection(this.fabricCanvas);

        // Event listeners for canvas modifications
        this.fabricCanvas.on("object:modified", () => this.saveState());
        this.fabricCanvas.on("object:placed", (e) => {
            let object = e.target as fabric.Object
            this.fabricCanvas.setActiveObject(object)

            if(object.constructor === fabric.Table){
                let target = object as fabric.Table;
                target.set({
                    columns: [{ width: target.width }],
                    rows: [{ height: target.height }],
                    cells: [[{}]],
                });
                target.initUndo();
                this.fabricCanvas.renderAll()
            }
            else if(object.constructor === fabric.Rect){
                let target = object as fabric.Rect;
                delete target.controls["mr"]
                delete target.controls["ml"]
                delete target.controls["mt"]
                delete target.controls["mb"]
                delete target.controls["mtr"]
                this.fabricCanvas.renderAll()
            }

            object.id = Math.random().toString()
            this.saveState()
        });
        this.fabricCanvas.on("object:removed", () => this.saveState());

        // Update undo and redo buttons
        this.updateUndoRedoButtons();

        // Event listener for keyboard shortcuts
        document.addEventListener("keyup", this.hotkeys.bind(this), false);

        this.fabricCanvas.enablePanning()
    }


    // Save the current state of the canvas to local storage
    saveState() {
        let data = this.fabricCanvas.toObject();
        localStorage.setItem('demo', JSON.stringify(data));
    }

    /**
     * Prepare Canvas-Select Zoom Menu
     */
    canvasSelectZoomMenu(){
        this.wrapperMenuEl.addEventListener("click", event => {
            let element = event.target as Element
            let target = this.fabricCanvas.getActiveObject() as fabric.Table

            switch (element.id) {
                case "zoom-in":
                    this.fabricCanvas.zoomIn()
                    break;
                case "zoom-out":
                    this.fabricCanvas.zoomOut()
                    break;
                case "fit-to-screen":
                    this.fabricCanvas.centerAndZoomOut()
                    break;
                case "undo":
                    target?.undo()
                    break;
                case "redo":
                    target?.redo()
                    break;
                case "clear":
                    this.fabricCanvas.clear()
                    break;
            }
        })
    }

    makeDemoTable(){
        let stored = localStorage.getItem('demo')
        let demo : {objects?: fabric.IObjectOptions[]} = stored && JSON.parse(stored);

        // if(demo?.objects.length){
        //     for(let obj of demo.objects ){
        //         if(obj.type === "table"){
        //             let table = new fabric.Table(obj)
        //             table.initUndo();
        //             this.fabricCanvas.add(table)
        //         }
        //     }
        // }
        // else {
        let table = new fabric.Table({
            id: "table-1",
            ...this.tableProperties,
            left: 87,
            top: 108,
            columns: [{width: 110, header: true}, {width: 110}, {width: 110}, {width: 110}, {width: 110}, {width: 110}],
            rows: [{height: 28, header: true}, {height: 25, header: true}, {height: 25}, {height: 25}, {height: 25}, {height: 25}, {height: 23}],
            cells: [
                [{colspan: 6, text: "1"}],
                [{text: "2"},            {text: "3"}, {colspan: 2,text: "4"},   {text: "5"}, {text: "6"}],
                [{rowspan: 3,text: "7"}, {text: "A"}, {text: "B"}, {text: "C"}, {text: "D"}, {text: "E"}],
                [{text: "F"}, {text: "G"}, {text: "H"}, {text: "I"}, {text: "K"}],
                [{text: "L"}, {text: "M"}, {text: "N"}, {text: "O"}, {text: "P"}],
                [{rowspan: 2,text: "8"}, {text: "Q"}, {text: "R"}, {text: "S"}, {text: "T"}, {text: "U"}],
                [{text: "V"}, {text: "W"}, {text: "X"}, {text: "Y"}, {text: "Z"}]
            ]
        })
        table.initUndo();


        let rect1 = new fabric.Rect({
            id: "rect-1",
            connections: ['rect-2'],
            left: 200,
            top: 350,
            width: 50,
            height: 100
        })
        let rect2 = new fabric.Rect({
            id: "rect-2",
            left: 250,
            top: 500,
            width: 100,
            height: 50
        })
        let rect3 = new fabric.Rect({
            id: "rect-3",
            // connections: ['rect-4','table-1.cell-1-1'],
            connections: ['table-1.cell-1-1'],
            left: 400,
            top: 350,
            width: 100,
            height: 50
        })
        let rect4 = new fabric.Rect({
            id: "rect-4",
            left: 500,
            top: 350,
            width: 100,
            height: 50
        })


        table.on("selection:end", ({cells}) => {
            if(cells.length === 1){
                let object = cells[0].o
                rect1.disconnect()
                rect1.connect(object)
            }
        })

        this.fabricCanvas.add(table)
        this.fabricCanvas.add(rect1)
        this.fabricCanvas.add(rect2)
        this.fabricCanvas.add(rect3)
        this.fabricCanvas.add(rect4)

        for(let obj of this.fabricCanvas._objects.filter(o => o.connections)){
            obj.updateConnections()
        }

        this.fabricCanvas.renderAll()
    }

    /**
     * Prepare Main Menu
     */
    makeMainMenu(){
        this.buttonsMenuEl.addEventListener("click", event =>  {
            let element = event.target as HTMLElement
            switch (element.id) {
                case "draw-rect": {
                    if(this.fabricCanvas.selection){
                        this.fabricCanvas.enableDrawing("rect")
                        element.textContent = "Cancel"
                    }
                    else{
                        this.fabricCanvas.disableDrawing()
                        element.textContent = "Draw Rect"
                    }
                    break;
                }
                case "draw-table": {
                    if(this.fabricCanvas.selection){
                        this.fabricCanvas.enableDrawing("table")
                        element.textContent = "Cancel"
                    }
                    else{
                        this.fabricCanvas.disableDrawing()
                        element.textContent = "Draw Table"
                    }
                    break;
                }
                case "create-table": {
                    let table = new fabric.Table({
                        ...this.tableProperties,
                        left: this.fabricCanvas.width/ 2 - 100,
                        top: this.fabricCanvas.height/ 2 - 50,
                        rows: [{height: 50},{height: 50}],
                        columns: [{width: 100},{width: 100}]
                    })
                    table.initUndo();
                    this.fabricCanvas.add(table)
                    this.fabricCanvas.setActiveObject(table)
                    break;
                }
                case "analyze":
                    this.analyzeTableObjects()
                    break;
            }
        });
    }

    /**
     * Prepare Context menu
     */
    makeContextMenu(){
        document.onmousedown = this.checkHideMenuIfClickedOutside.bind(this);
        document.oncontextmenu = this.updateContextMenu.bind(this);
        this.contextMenuEl.addEventListener("click", event =>  {
            let element = event.target as Element
            let target = this.fabricCanvas.getActiveObject() as fabric.Table
            switch (element.id) {
                case "undo-table-changes":
                    target?.undo()
                    break;
                case "redo-table-changes":
                    target?.redo()
                    break;
                case "delete-table":
                    this.fabricCanvas.remove(target)
                    break;
                case "insert-column": {
                    let bounds = target.getSelectionBounds()
                    if(bounds){
                        target.insertColumn(bounds.x2)
                    }
                    break;
                }
                case "insert-row": {
                    let bounds = target.getSelectionBounds()
                    if(bounds) {
                        target.insertRow(bounds.y2)
                    }
                    break;
                }
                case "delete-column": {
                    target.deleteSelectedColumns()
                    break;
                }
                case "delete-row": {
                    target.deleteSelectedRows()
                    break;
                }
                case "merge-cells": {
                    target.mergeSelection()
                    break;
                }
                case "unmerge-cells": {
                    target.unmergeSelection()
                    break;
                }
                case "set-column-header": {
                    let bounds = target.getSelectionBounds();
                    if(bounds){
                        for(let column = bounds.x; column <= bounds.x2; column ++){
                            target.setHeaderColumn(column,true)
                        }
                    }
                    break;
                }
                case "set-row-header": {
                    let bounds = target.getSelectionBounds();
                    if(bounds) {
                        for (let row = bounds.y; row <= bounds.y2; row++) {
                            target.setHeaderRow(row, true)
                        }
                    }
                    break;
                }
                case "unset-column-header": {
                    let bounds = target.getSelectionBounds();
                    if(bounds) {
                        for (let column = bounds.x; column <= bounds.x2; column++) {
                            target.setHeaderColumn(column, false)
                        }
                    }
                    break;
                }
                case "unset-row-header":{
                    let bounds = target.getSelectionBounds();
                    if(bounds) {
                        for (let row = bounds.y; row <= bounds.y2; row++) {
                            target.setHeaderRow(row, false)
                        }
                    }
                    break;
                }

                default:
                    return;
            }
            this.contextMenuEl.style.display = 'none';
        })
    }

    /**
     * Prepare Modal Dialog
     */
    makeResultsDialog(){


        this.closeDialogButton.addEventListener('click', () => {
            this.resultsDialogEl.close();
        })

        this.resultsDialogEl.addEventListener('click', (event)=> {
            let rect = this.resultsDialogEl.getBoundingClientRect();
            let isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
            if (!isInDialog) {
                this.resultsDialogEl.close();
            }
        })
    }

    /**
     * Hide Context Menu If user clicked on the document outside Context Menu Element
     * @param e
     */
    checkHideMenuIfClickedOutside(e: MouseEvent) {
        if(!this.contextMenuEl.contains(e.target as Node)){
            this.contextMenuEl.style.display = "none"
        }
    }

    /**
     * show or hide element with speified id
     * @param id
     * @param c
     */
    _showHide(id: string,c : boolean ,displayStyle: string =  'block'){
        let el = document.getElementById(id)
        if(el){
            el.style.display = c  ? displayStyle : 'none';
        }
    }

    hotkeys(e: KeyboardEvent) {

        let active = this.fabricCanvas.getActiveObject() as fabric.Table
        let table = active?.type === "table" && active as fabric.Table

        if (e.ctrlKey && e.code === 'KeyZ') {
            if(table && table.undoable()){
                table.undo();
            }
        }

        if (e.ctrlKey && e.code === 'KeyY') {
            if(table && table.redoable()){
                table.redo();
            }
        }

        if (e.code === 'Delete') {
            if(active){
                this.fabricCanvas.remove(active)
            }
        }
    }

    /**
     * Context menu
     * @param e
     */
    updateContextMenu(e: MouseEvent) {
        e.preventDefault();

        let active = this.fabricCanvas.getActiveObject() as fabric.Object
        let table = active?.type === "table" && active as fabric.Table

        if (this.contextMenuEl.style.display == "block"){
            this.contextMenuEl.style.display = "none"
        }
        else if(table){
            this._showHide("set-column-header",!!table.selection.find(cell => !cell.c.header));
            this._showHide("set-row-header",!!table.selection.find(cell => !cell.r.header));
            this._showHide("unset-column-header",!!table.selection.find(cell => cell.c.header));
            this._showHide("unset-row-header",!!table.selection.find(cell => cell.r.header));

            this._showHide("insert-column",table.isInsertColumnAvailableForSelection());
            this._showHide("insert-row",table.isInsertRowAvailableForSelection());
            this._showHide("undo-table-changes",table.undoable());
            this._showHide("redo-table-changes",table.redoable());
            this._showHide("merge-cells",table.isSelectionMergeble());
            this._showHide("unmerge-cells",table.isSelectionUnmergeble());
            this._showHide("delete-column",table.isRemoveColumnAvailableForSelection());
            this._showHide("delete-row",table.isRemoveRowAvailableForSelection());
            this._showHide("delete-table",!!table);


            this.contextMenuEl.style.display = 'block';
            this.contextMenuEl.style.left = e.pageX + "px";
            this.contextMenuEl.style.top = e.pageY + "px";
        }
    }

    /**
     * remove previously created HTML Table Elements and JSON annotation codes
     */
    clearResults(){
        let child = this.resultContainerEl.lastElementChild;
        while (child) {
            this.resultContainerEl.removeChild(child);
            child = this.resultContainerEl.lastElementChild;
        }
    }

    /**
     * Get info for all Tables and show it in the modal dialog
     */
    analyzeTableObjects(){
        this.clearResults()
        this._tables = 0
        for(let obj of this.fabricCanvas._objects){
            if(obj.type === "table"){
                this.analyzeTable(obj as fabric.Table)
            }
        }
        this.resultsDialogEl.showModal();
    }

    /**
     * print Table element as HTML Element and JSON annotation code
     * @param o
     */
    updateCode(code: HTMLElement, o: fabric.Table, cells: fabric.TableCellOutput[][]){

        //adjust table and table cell coordiantes to background image coordianates
       let image = this.fabricCanvas.backgroundImage as fabric.Image

        let annotation: Annotation = {
            bbox: o.getCoords(),
            column_headers: o.columns!.filter(c => c.header === true).length,
            row_headers:  o.rows!.filter(r => r.header === true).length,
            cells: []
        }

        for(let cellsrow of cells) {
            for (let cell of cellsrow) {
                annotation.cells.push({
                    row: cell.y!,
                    col: cell.x!,
                    row_span: cell.rowspan!,
                    col_span: cell.colspan!,
                    words: cell.text!,
                    bbox: cell.coords!,
                    is_row_header: o.rows![cell.y!].header || false,
                    is_col_header: o.columns![cell.x!].header || false
                })
            }
        }

        code.innerHTML = JSON.stringify(annotation, null,4)
            .replace(/"(\w+)":/g,`<span ~variable>$1</span>:`)
            .replace(/(["'])((\\{2})*|(.*?[^\\](\\{2})*))\1/g,`<span ~string>"$2"</span>`)
            .replace(/\s(\d+(\.\d+)?)/g,` <span ~number>$1</span>`)
            .replace(/\~(\w+)/g,`class="$1"`)
    }

    analyzeTable(o : fabric.Table){
        this._tables ++

        let progress = 0
        let promises : Promise<any>[] = []
        let workers : Tesseract.Worker[] = []
        let header = document.createElement("h3")
        header.textContent = `Table #${this._tables}`
        this.resultContainerEl.appendChild(header)


        let table : HTMLTableElement = document.createElement("table")
        let cells = o.getCells({includeAll: true})

        let tr
        for (let y =0 ; y < cells.length ; y++) {
            let rowHeight = o.rows![y]
            tr = document.createElement("tr")
            tr.style.height = rowHeight + 'px'
            table.appendChild(tr)

            for(let cell of cells[y]){
                let w = cell.width! * o.scaleX!
                let h = cell.height! * o.scaleX!

                let td = document.createElement("td")
                if (cell.colspan) {
                    td.colSpan = cell.colspan
                }
                if (cell.rowspan) {
                    td.rowSpan = cell.rowspan
                }
                td.style.paddingLeft = o.cellPadding * o.scaleX! + 'px'
                td.style.color = o.fillText!
                td.style.width = w + 'px'
                td.style.maxWidth = w + 'px'
                td.style.height = h + 'px'
                td.style.maxHeight = h + 'px'
                tr.appendChild(td)

                let coords = cell.coords!
                let fImage = o.canvas!.backgroundImage as fabric.Image
                let image  = fImage.getElement() as HTMLImageElement

                let promise = new Promise((resolve,reject)=>{
                    let dataURL = this.extractImage(coords,image)!
                    td.style.backgroundImage = `url(${dataURL})`

                    return createWorker("eng")
                        .then(worker => {
                            workers.push(worker)
                            return worker.recognize(dataURL)
                        })
                        .then((response) => {
                            progress ++
                            summary.textContent = `JSON code (Progress: ${progress} /  ${promises.length})`
                            let result = response.data.text.replace(/\n$/,"")
                            td.textContent = result
                            cell.text = result
                            o.disableHistory()
                            o.setCellText(cell.x!,cell.y!,result)
                            o.enableHistory()
                        })
                })
                promises.push(promise)

            }

        }

        this.resultContainerEl.appendChild(table)
        let details = document.createElement("details")
        this.resultContainerEl.appendChild(details)
        let summary = document.createElement("summary")
        details.appendChild(summary)
        let pre = document.createElement("pre")
        details.appendChild(pre)
        let code = document.createElement("code")
        pre.appendChild(code)
        let hr = document.createElement("hr")
        this.resultContainerEl.appendChild(hr)

        summary.textContent = `JSON code (Progress: 0 / ${promises.length})`

        this.updateCode(code,o, cells)

        Promise.all(promises).then(()=>{
            o.addUndoState()
            this.saveState()
            summary.textContent = `JSON code (Complete)`
            this.updateCode(code,o, cells)
        })

    }

    updateUndoRedoButtons(){
        let active = this.fabricCanvas.getActiveObject()
        let table = active?.type === "table" && active as fabric.Table
        this._showHide("undo",table && table.undoable(),"inline-block");
        this._showHide("redo",table && table.redoable(),"inline-block");
    }

    /**
     * track selected object on canvas
     */
    updateTarget(){
        let active = this.fabricCanvas.getActiveObject()
        Object.defineProperty(window,"target",{
            value: active,
            writable: true
        })
        this.updateUndoRedoButtons()
    }

    /**
     * add global target variable for active object
     * @param canvas
     */
    debugSelection(canvas: fabric.Canvas){


        Object.defineProperty(window,"canvas",{value: this.fabricCanvas})
        this.fabricCanvas.on("history",this.updateUndoRedoButtons.bind(this))
        this.fabricCanvas.on("selection:created",this.updateTarget.bind(this))
        this.fabricCanvas.on("selection:updated",this.updateTarget.bind(this))
        this.fabricCanvas.on("selection:cleared",this.updateTarget.bind(this))
    }

    /**
     * extract parts of the image which will be processed by Tesseract
     */
    extractImage(coords: [fabric.IPoint,fabric.IPoint,fabric.IPoint,fabric.IPoint], element: HTMLImageElement){
        if(!element){
            return ''
        }
        let tmpCanvas = document.createElement("canvas")
        let tmpContext = tmpCanvas.getContext('2d')!
        tmpCanvas.width = coords[1].x - coords[0].x + TABLE_OCR_PADDING * 2
        tmpCanvas.height = coords[2].y - coords[1].y + TABLE_OCR_PADDING * 2
        tmpContext.drawImage(element, -(coords[0].x - TABLE_OCR_PADDING), -(coords[0].y - TABLE_OCR_PADDING))
        return tmpCanvas.toDataURL()
    }
}

new Demo({
    imageSrc: "./test.png"
})

