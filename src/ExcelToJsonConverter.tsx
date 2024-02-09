import { useState } from 'react';
import * as XLSX from 'xlsx';
import { writeBinaryFile, BaseDirectory } from '@tauri-apps/api/fs';
import { message } from '@tauri-apps/api/dialog';
import { chain } from 'lodash';

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}


export function ExcelToJsonConverter() {
    let jsonData = [] as any[];
    let firstColumnName = "";
    const [files, setFiles] = useState<FileList | null>(null);

    async function convertExcelToJson(files: FileList, isFirstSheetOnly: boolean = false) {
        jsonData = [];
        for (const file of files) {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "buffer" });
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                firstColumnName = worksheet.A1.v;
                console.log("firstColumnName:::", firstColumnName);
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

    async function downloadExcel(filename: string) {
        /* generate worksheet and workbook */
        const worksheet = XLSX.utils.json_to_sheet(jsonData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Merged");

        /* create an XLSX file and try to save to Presidents.xlsx */
        const u8 = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

        console.log(u8);
        console.log(jsonData);
        await writeBinaryFile(filename + '.xlsx', u8, { dir: BaseDirectory.Download });
    }

    async function handleSplitFile(): Promise<void> {
        try {
            if (!files)
                return;

            await convertExcelToJson(files, true);

            if (jsonData.length > 0) {
                var groupBy = chain(jsonData)
                    .groupBy(firstColumnName)
                    .map((value, key) => ({ key: key, values: value }))
                    .value();

                for (const group of groupBy) {
                    jsonData = group.values;
                    await downloadExcel(`splited-${group.key}-${uuidv4()}`);
                    jsonData = [];
                }

                await message(`Split file success`, 'Message');
            }


        } catch (error: any) {
            await message(error.message, { title: "Error", type: "error" });
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