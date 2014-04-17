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
         alertify.set({ labels: {
                ok     : i18n.t("Test"),
                cancel : i18n.t("Skip test at own risk")
              } });

        alertify.confirm(i18n.t('It looks like we have not performed the compatability test on this browser')+'.'+ i18n.t('Click ok to run the test')+'.'+i18n.t('If this browser is compatabile, you will be returned to this page when the test is complete')+'.',function(e){
            
            alertify.set({ labels: {
                ok     : i18n.t("Ok"),
                cancel : i18n.t("Cancel")
              } });

            if (e) {
                window.location = '../test';
            } else {
                cb(true);
            }
        })
        return;
    }
    if(!settings.compatability.satisfied)
    {
         alertify.set({ labels: {
                ok     : i18n.t("Test"),
                cancel : i18n.t("Skip test at own risk")
              } });

        alertify.confirm(i18n.t('It looks like the compatability test has previously failed on this computer')+'.'+i18n.t('You must pass the test before loading a world')+'.'+i18n.t('Click ok to run the test again')+'.',function(e){
            
             alertify.set({ labels: {
                ok     : i18n.t("Ok"),
                cancel : i18n.t("Cancel")
              } });

            if (e) {
                window.location = '../test';
            } else {
                cb(true);
            }
        })
        return;
    }
    cb(true);
});
}
