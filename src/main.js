import App from './App.svelte';
import "./bust";
import "./bust2";
import '@angular/core';
import '@angular/common';
import 'react';

const app = new App({
	target: document.body,
	props: {
		name: 'world'
	}
});

export default app;