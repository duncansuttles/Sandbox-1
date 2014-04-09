"use strict";

// Copyright 2012 United States Government, as represented by the Secretary of Defense, Under
// Secretary of Defense (Personnel & Readiness).
// 
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
// 
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software distributed under the License
// is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied. See the License for the specific language governing permissions and limitations under
// the License.



function updateOverlay(cb)
{

  require(['vwf/view/editorview/alertify.js-0.3.9/src/alertify'], function (alertify) {   
    var settings = JSON.parse(window.localStorage['sandboxPreferences'] || null) || {};
    if(!settings.compatability)
    {
        alertify.alert('It looks like we have not performed the compatability test on this browser. Click ok to run the test. If this browser is compatabile, you will be returned to this page when the test is complete.',function(){
            window.location = '../test';
        })
        return;
    }
    if(!settings.compatability.satisfied)
    {
        alertify.alert('It looks like the compatability test has previously failed on this computer. You must pass the test before loading a world. Click ok to run the test again.',function(){
            window.location = '../test';
        })
        return;
    }
    cb(true);
});
}
