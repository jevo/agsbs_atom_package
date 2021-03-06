'use babel';

const iPath = require('path');
const fs = require('fs');
import ViewManager from './view-manager';
import DialogView from './dialog-view';
import Matuc from './matuc-commands';
import ErrorMessageFormatter from './error-message-formatter';
export default class InsertGraphicDialog extends DialogView {

	constructor(serializedState) {

		const agsbs = atom.packages.getLoadedPackage('agsbs-atom-package').mainModule;
		const language = agsbs.language;
		const viewManager = agsbs.viewManager;
		const editor = agsbs.editorFunctions;
		const matuc = agsbs.matuc;

		//get this.element and its child dialogContent from superclass
		super(serializedState);

		this.dialogHeadline.innerHTML = language.insertGraphic;

		const insertGraphicForm = document.createElement('form');
		insertGraphicForm.classList.add('insert_graphic_form');
		insertGraphicForm.setAttribute('method','post');

		this.altText = this.viewManager.addTextarea(insertGraphicForm, 'alt_text', language.altText);
		this.file = this.viewManager.addFilePicker(insertGraphicForm, 'graphic_file', language.graphicFile, 'file');
		this.file.setAttribute('accept', 'image/*');

		this.pictureDrop = viewManager.addDropDownMenu(insertGraphicForm, 'pictures', language.selectPicture, []);
		this.pictureDrop.parentNode.style.width = '100%';

		this.or = document.createElement('p');
		this.or.innerHTML = language.or;
		insertGraphicForm.appendChild(this.or);
		this.uri = this.viewManager.addTextInput(insertGraphicForm, 'uri', language.uri);
		const title = this.viewManager.addTextInput(insertGraphicForm, 'graphic_title', language.graphicTitle);

		const insertGraphicSubmit = document.createElement('input');
		insertGraphicSubmit.setAttribute('type', 'submit');
		insertGraphicSubmit.setAttribute('value',language.insert);
		viewManager.disableButton(insertGraphicSubmit);

		insertGraphicForm.appendChild(insertGraphicSubmit);
		this.dialogContent.appendChild(insertGraphicForm);

		const altText = this.altText;
		const uri = this.uri;
		const file = this.file;

		this.altText.addEventListener('input', function() {
			if(file.files[0] || uri.value || pictures.selectedIndex > 0) {
				viewManager.enableButton(insertGraphicSubmit);
			};
			if(altText.value == ''){
				viewManager.disableButton(insertGraphicSubmit);
			}
		});

		this.file.addEventListener('change', function() {
			uri.setAttribute('disabled', '');
			if(altText.value != '') {
				viewManager.enableButton(insertGraphicSubmit);
			};
		});

		this.pictureDrop.addEventListener('change', function() {
			if(pictures.selectedIndex > 0){
				uri.value = pictures.options[pictures.selectedIndex].value;
				if(altText.value != '') {
					viewManager.enableButton(insertGraphicSubmit);
				};
			}else{
					viewManager.disableButton(insertGraphicSubmit);
					uri.value = "";
			}
		});

		this.uri.addEventListener('input', function() {
			if(altText.value) {
				viewManager.enableButton(insertGraphicSubmit);
			};
		});

		insertGraphicForm.addEventListener('reset', function() {
			viewManager.disableButton(insertGraphicSubmit);
		});

		insertGraphicForm.addEventListener('submit', function(event) {
			let alt, location, title, currentPath;
			alt = altText.value;
			location = typeof file.files[0] === 'undefined' ? uri.value : file.files[0].path;
			title = this.title.value;
			currentPath = iPath.dirname(atom.workspace.getActivePaneItem().buffer.file.path);
			//alt = alt.replace(/\n/g, ' <br> ');
			if(title){
				title = title.replace(/\s/g, '_');
			}else{
				title = "";
			}
			let promise = matuc.imgDesc(alt, currentPath, title, location);
			promise.then(function(fragment) {
				editor.insertGraphic(fragment.internal.verbatim);
				if (fragment.external) {
					var fd = fs.openSync(currentPath + '/bilder.md', 'a+');
					fs.write(fd, fragment.external.verbatim, (error) => {
						if (error) {
							atom.notifications.addError(language.somethingWentWrongDuringInsertOfGraphic, {
								detail : error,
								dismissable : true
							});
							return;
						} else {
							atom.notifications.addSuccess('bilder.md ' + language.imagesMdHasBeenWritten, {
								detail : 'in: ' + currentPath,
								dismissable : true
							});
							fs.closeSync(fd);
						}
					});
				}
			}).catch(function(error) {
				atom.notifications.addError(language.somethingWentWrongDuringInsertOfGraphic, {
					detail : error,
					dismissable : true
				});
			});
			viewManager.closeDialog();
		});
	}

	setSelectedAsAltText() {
		var selectedText = atom.workspace.getActivePaneItem().getSelectedText();
		if (selectedText != '') {
			this.altText.value = selectedText;
		}
	}
	addPictureData(){
		var editor = atom.workspace.getActivePaneItem();
		var path = "";
		if (editor.buffer.file) {
			path = iPath.dirname(editor.buffer.file.path);
		} else {
			var formatter = new ErrorMessageFormatter();
			message = formatter.formatErrorMessage(this.language.selectMdFile, false);
			atom.notifications.addError(this.language.error, {
				detail : message,
				dismissable : true
			});
			this.viewManager.closeDialog();
			return;
		}
		var self = this;
		var imageArray = [];
		//ToDo
		var pathPicture = iPath.join(path,'bilder');

		var promiseGetAll = new Promise(function(resolve, reject) {
			fs.exists(pathPicture, function(exists) {
	  			if (exists) {
					fs.readdir(pathPicture, function(err, files) {
						files.filter(function(file){
	            			return ((file.toLowerCase().substr(-4) === '.png') ||
							(file.toLowerCase().substr(-4) === '.jpg') ||
							(file.toLowerCase().substr(-4)=== '.svg'));
	        			}).forEach(function(file) {
	            			imageArray.push(file);
	        			});
						resolve(imageArray);
	  				});
				}
			});
		});
		// imageArray = self.getAllPicturFromPath(pathPicture);
		var promiseReset = new Promise(function(resolve, reject) {
			while(self.pictureDrop.options.length != 0) {
    		self.pictureDrop.remove(0);
    	};
			self.pictureDrop.items = [];
			resolve(true);
		});
		Promise.all([promiseReset, promiseGetAll]).then(function(){
			var promiseAddToSelection = new Promise(function(resolve, reject){
				self.pictures = imageArray;
				if(imageArray.length == 0){
						var formatter  = new ErrorMessageFormatter();
						var message = self.language.thereAreNoPicturesInFolder	+ " "
						 						 + self.language.addPictureToFolder + "\""+pathPicture  +"\"";
						message = formatter.formatErrorMessage(message, false);
						atom.notifications.addError(self.language.ErrorNoPicture, {
							detail : message,
							dismissable : true
						});
					self.viewManager.closeDialog();
				}
				self.addItemToPictureDropdown(imageArray, pathPicture);
				resolve(true);
			});
		});
	}

	getAllPicturFromPath(pathPicture) {
		var imageArray = [];
		fs.exists(pathPicture, function(exists) {
  			if (exists) {
				fs.readdir(pathPicture, function(err, files) {
					files.filter(function(file){
            			return ( (file.toLowerCase().substr(-4) === '.png') ||
								 (file.toLowerCase().substr(-4) === '.jpg') ||
								 (file.toLowerCase().substr(-4) === '.svg'));
        			}).forEach(function(file){
            			imageArray.push(file);
        			});
  				});
			}
		});
		return imageArray;
	}

	addItemToPictureDropdown(imageArray, path) {
		this.pictureDrop.options.add(new Option(this.language.selectImageFile, null));
		for (var i = 0; i < imageArray.length; i++) {
			this.pictureDrop.options.add(new Option(imageArray[i], iPath.join(path,imageArray[i])));
		}
	}
	resetPictureDropdown(){
		var length = this.pictureDrop.options.length;
		for(var i = 0; i < length; i++){
			this.pictureDrop.remove(i);
		}
		this.pictureDrop.items = [];
	}
}
