import { fabric } from 'fabric';
import "./ObjectOptions";
import "./UndoMixin";
import "./CanvasDrawing";
import "./Table";

describe('FabricTable', () => {

    let options: fabric.TableOptions = {
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
    }

    let options2 = {
        columns: [{width: 100}],
        rows: [{height: 100}],
        cells: [[{text: "NULL"}]],
    }

    // let canvas: fabric.Table

    let table: fabric.Table  = new fabric.Table(options)
    let canvas: fabric.Canvas = new fabric.Canvas(null, {width: 1000, height: 1000});

    beforeEach(() => {});

    afterEach(() => {});

    it('constructor initializes properties', () => {
        expect(table.type).toBe('table');
    });

    it('check property initialization', () => {
        expect(table.columns).toEqual(options.columns)
        expect(table.rows).toEqual(options.rows)
        expect(table.cells).toEqual(options.cells)
        expect(table.width).toEqual(660)
        expect(table.height).toEqual(176)
    });

    it('init undo', () => {
        table.initUndo()
        expect(table.undoable()).toEqual(false)
        expect(table.redoable()).toEqual(false)
    })

    it('add undo state', () => {
        table.set(options2)
        table.addUndoState()
        expect(table.undoable()).toEqual(true)
        expect(table.redoable()).toEqual(false)
    })

    it('perform undo', () => {
        table.undo()
        expect(table.columns).toEqual(options.columns)
        expect(table.rows).toEqual(options.rows)
        expect(table.cells).toEqual(options.cells)
        expect(table.width).toEqual(660)
        expect(table.height).toEqual(176)
        expect(table.undoable()).toEqual(false)
        expect(table.redoable()).toEqual(true)
    })

    it('perform redo', () => {
        table.redo()
        expect(table.undoable()).toEqual(true)
        expect(table.redoable()).toEqual(false)
        expect(table.columns).toEqual(options2.columns)
        expect(table.rows).toEqual(options2.rows)
        expect(table.cells).toEqual(options2.cells)
        expect(table.width).toEqual(100)
        expect(table.height).toEqual(100)
    })

    // Add more tests for other methods and functionalities
    it('render method updates canvas', () => {
        canvas.renderAll = jasmine.createSpy('renderAll');
        table.set(options)
        canvas.add(table)
        expect(table.canvas!.renderAll).toHaveBeenCalledTimes(0);
        table.set(options2)
        expect(table.canvas!.renderAll).toHaveBeenCalledTimes(1);
    });
});
