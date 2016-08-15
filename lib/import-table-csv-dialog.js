'use babel';

import ViewManager from './view-manager';
import DialogView from './dialog-view';
import Matuc from './matuc-commands';

export default class ImportTableCsvDialog extends DialogView {

	constructor(serializedState) {

		const agsbs = atom.packages.getLoadedPackage('agsbs-atom-package').mainModule;
		const language = agsbs.language;
		const viewManager = agsbs.viewManager;
		const editor = agsbs.editorFunctions;

		//get this.element and its child dialogContent from superclass
		super(serializedState);

		const importTableCsvForm = document.createElement('form');
		importTableCsvForm.setAttribute('method','post');

		const fileInput = this.viewManager.addFilePicker(importTableCsvForm, 'csv_file', language.link, 'file');
		fileInput.setAttribute('accept', '.csv');

		const importTableCsvSubmit = document.createElement("input");
		importTableCsvSubmit.setAttribute('type', 'submit');
		importTableCsvSubmit.setAttribute('value','Submit');

		importTableCsvForm.appendChild(importTableCsvSubmit);
		this.dialogContent.appendChild(importTableCsvForm);

		importTableCsvForm.addEventListener('submit', function(event) {
			var file = fileInput.files[0];
			editor.importTableFromCsv(file);
			viewManager.closeDialog();
		});
	}
}