(self.webpackChunkVLab=self.webpackChunkVLab||[]).push([[739],{7739:(n,e,o)=>{var t,s;t=[o(33360),o(19755)],void 0===(s=function(n,e){labInfo=function(){};var o=null,t=n.channel("app");return labInfo.prototype.getWorkbenchItems=function(){var n=null;console.log("getWorkbenchItems");var e=t.subscribe("workbenchItems",(function(e){console.log("got 'em"),n=e.workbenchItems}));return t.publish("workbenchItemsRequest"),function o(){return null===n?o():(e.unsubscribe(),n)}()},labInfo.prototype.isFinishedLoading=function(){console.log("isFinishedLoading");var n=!1,e=t.subscribe("finishedLoading",(function(e){n=e.finishedLoading}));return t.publish("finishedLoadingRequest"),n&&e.unsubscribe(),n},labInfo.prototype.getSelectedItem=function(){var n=null;console.log("getSelectedItem");var e=t.subscribe("selectedVessel",(function(e){console.log("got it"),n=e.selectedVessel}));return t.publish("selectedVesselRequest"),function o(){return null===n?o():(e.unsubscribe(),n)}()},labInfo.prototype.loadAssignment=function(){n.channel("app").publish("loadAssignment",{})},labInfo.prototype.loadAssignmentJSON=function(e){n.channel("app").publish("loadAssignmentJSON",e)},labInfo.getInstance=function(){return null===o&&(o=new labInfo),o},labInfo.getInstance()}.apply(e,t))||(n.exports=s)}}]);
//# sourceMappingURL=739-d2012c7aaa5f994b630e.js.map