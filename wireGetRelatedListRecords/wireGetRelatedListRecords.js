// wireGetRelatedListRecords.js
import {api, LightningElement, wire} from 'lwc';
import {getRelatedListRecordsBatch} from 'lightning/uiRelatedListApi';
import {createRecord, getFieldValue, notifyRecordUpdateAvailable} from "lightning/uiRecordApi";
import {
    registerRefreshContainer,
    unregisterRefreshContainer,
    REFRESH_ERROR,
    REFRESH_COMPLETE,
    REFRESH_COMPLETE_WITH_ERRORS,
    RefreshEvent
} from "lightning/refresh";
import {refreshApex} from '@salesforce/apex';
import {ShowToastEvent} from "lightning/platformShowToastEvent";
import CONTACT_OBJECT from "@salesforce/schema/Contact";
import FIRSTNAME_FIELD from "@salesforce/schema/Contact.FirstName";
import LASTNAME_FIELD from "@salesforce/schema/Contact.LastName";
import ACCOUNT_FIELD from '@salesforce/schema/Contact.AccountId';

export default class WireGetRelatedListRecords extends LightningElement {
    @api recordId;
    error;
    results;
    wireRelatedList;

    refreshContainerID;

    connectedCallback() {
        this.refreshContainerID = registerRefreshContainer(
            this.template.host,
            this.refreshContainer.bind(this),
        );
    }

    disconnectedCallback() {
        unregisterRefreshContainer(this.refreshContainerID);
    }

    refreshContainer(refreshPromise) {
        console.log("refreshing");
        return refreshPromise.then((status) => {
            if (status === REFRESH_COMPLETE) {
                console.log("Done!");
            } else if (status === REFRESH_COMPLETE_WITH_ERRORS) {
                console.warn("Done, with issues refreshing some components");
            } else if (status === REFRESH_ERROR) {
                console.error("Major error with refresh.");
            }
        });
    }

    @wire(getRelatedListRecordsBatch, {
        parentRecordId: '$recordId',
        relatedListParameters: [
            {
                relatedListId: "Contacts",
                fields: ["Contact.Name", "Contact.Id", "Account.Id"],
                sortBy: ["Name"],
            },
            {
                relatedListId: "Cases",
                fields: ["Case.CaseNumber", "Case.Subject"],
                sortBy: ["CaseNumber"],
            },
        ],
    }) listInfo(resultInfo) {
        this.wireRelatedList = resultInfo;
        if (resultInfo.data) {
            this.results = resultInfo.data.results;
            console.log(JSON.stringify(this.results, null, 4));
            this.error = undefined;
        } else if (resultInfo.error) {
            this.error = resultInfo.error;
            this.results = undefined;
        }
    }

    createNewContact() {
        const fields = {};
        fields[FIRSTNAME_FIELD.fieldApiName] = this.randomString;
        fields[LASTNAME_FIELD.fieldApiName] = 'Last Name';
        fields[ACCOUNT_FIELD.fieldApiName] = this.recordId;
        const recordInput = {apiName: CONTACT_OBJECT.objectApiName, fields};
        createRecord(recordInput)
            .then((contact) => {
                console.log(JSON.stringify(contact, null, 4));
                const name = `${getFieldValue(contact, FIRSTNAME_FIELD)} ${getFieldValue(contact, LASTNAME_FIELD)}`
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Success",
                        message: `Contact created "${name}"`,
                        variant: "success",
                    }),
                );
                this.handleRefresh();
            })
            .catch((error) => {
                console.log(error.body);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Error creating record",
                        message: error.body.message,
                        variant: "error",
                    }),
                );
            });
    }

    get randomString() {
        return (Math.random() + 1).toString(36).substring(5);
    }

    handleRefresh() {
        notifyRecordUpdateAvailable([
            {recordId: this.recordId},
        ]).then(() => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Success",
                    message: 'Refresh Completed',
                    variant: "success",
                }),
            );
        });
        this.dispatchEvent(new RefreshEvent());
        this.refreshApex(this.wireRelatedList).then((result) => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Success",
                    message: 'Refresh Completed: ' + result,
                    variant: "success",
                }),
            );
        }).catch((ex) => {
            this.dispatchEvent(new ShowToastEvent({
                title: "Error",
                message: 'Error: ' + JSON.stringify(ex),
                variant: "error",
            }))
        })
    }
}
