import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createDir, writeBinaryFile, BaseDirectory } from '@tauri-apps/api/fs';
import { message } from '@tauri-apps/api/dialog';
import { chain } from 'lodash';

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}


export function ExcelToJsonConverter() {
    let jsonData = [] as any[];
    let columnNames = [] as any[];
    const [files, setFiles] = useState<FileList | null>(null);

    async function convertExcelToJson(files: FileList, isFirstSheetOnly: boolean = false) {
        jsonData = [];
        columnNames = [];
        for (const file of files) {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "buffer", cellDates: true });
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1, defval: null });

                // Define the range (in this case, the first row)
                const range = XLSX.utils.decode_range(worksheet['!ref'] ?? "");
                range.s.r = 0; // set start row to 0
                range.e.r = 0; // set end row to 0

                // Iterate over each cell in the first row
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = { r: range.s.r, c: C };
                    const cellRef = XLSX.utils.encode_cell(cellAddress);
                    const cellValue = worksheet[cellRef] ? worksheet[cellRef].v : undefined;

                    // Push the cell value to the array
                    columnNames.push(cellValue);
                }

                console.log("columnNames:::", columnNames);
                jsonData.push(...json);

                if (isFirstSheetOnly) {
                    break;
                }
            }
        }
    }

    async function handleMergeFiles(): Promise<void> {
        try {
            if (!files)
                return;

            await convertExcelToJson(files);
            await downloadExcel(`merged-${uuidv4()}`);
            await message(`Merged files success: merged-${uuidv4()}.xlsx`, 'Message');
        } catch (error: any) {
            await message(error.message, { title: "Error", type: "error" });
        }
    }

    async function downloadExcel(filename: string, sheetName: string = "Sheet1") {
        /* generate worksheet and workbook */
        let aoa = [];

        let row = [];

        for (const key in columnNames) {
            row.push(columnNames[key]);
        }

        aoa.push(row);

        for (const data of jsonData) {
            row = [];

            for (const key in data) {
                row.push(data[key]);
            }

            aoa.push(row);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        /* create an XLSX file and try to save to Presidents.xlsx */
        const u8 = XLSX.write(workbook, { type: "array", bookType: "xls" });

        console.log(u8);
        console.log(jsonData);

        // Create the `$APPDATA/users` directory
        await createDir('excel-tool', { dir: BaseDirectory.Download, recursive: true });


        await writeBinaryFile('excel-tool/' + filename + '.xls', u8, { dir: BaseDirectory.Download });
    }

    async function handleSplitFile(): Promise<void> {
        try {
            if (!files)
                return;

            await convertExcelToJson(files, true);

            if (jsonData.length > 0) {
                var groupBy = chain(jsonData)
                    .groupBy(0)
                    .map((value, key) => ({ key: key, values: value }))
                    .value();

                for (const group of groupBy) {
                    jsonData = group.values;
                    await downloadExcel(group.key, group.key);
                    jsonData = [];
                }

                await message(`Split file success`, 'Message');
            }


        } catch (error: any) {
            await message(error.message, { title: "Error", type: "error" });
            console.error(error);
        }
    }

    return (
        <div>
            <div style={{ width: "100%" }}>
                <input type="file" accept=".xls,.xlsx" multiple={true} onChange={e => setFiles(e.target.files)} />
            </div>
            <div style={{ padding: "5px" }}>
                <button style={{ marginLeft: "5px" }} onClick={() => handleMergeFiles()}>Merge files</button>
                <button style={{ marginLeft: "5px" }} onClick={() => handleSplitFile()}>Split file</button>
            </div>
        </div>
    );
}