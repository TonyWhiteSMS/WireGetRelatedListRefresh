// graphQLGetRelatedListRecords.js
import { api, LightningElement, wire } from "lwc";
import { createRecord, getFieldValue } from "lightning/uiRecordApi";
import { RefreshEvent } from "lightning/refresh";
import { gql, graphql, refreshGraphQL } from "lightning/uiGraphQLApi";

import { ShowToastEvent } from "lightning/platformShowToastEvent";
import CONTACT_OBJECT from "@salesforce/schema/Contact";
import FIRSTNAME_FIELD from "@salesforce/schema/Contact.FirstName";
import LASTNAME_FIELD from "@salesforce/schema/Contact.LastName";
import ACCOUNT_FIELD from "@salesforce/schema/Contact.AccountId";

export default class GraphQLGetRelatedListRecords extends LightningElement {
    @api recordId;
    error;
    wireRelatedList;
    contacts;
    refreshHandlerID;
    graphqlResult;

    @wire(graphql, {
        query: gql`
            query relatedRecords($recordId: ID!) {
                uiapi {
                    query {
                        Account(where: { Id: { eq: $recordId } }) {
                            edges {
                                node {
                                    Id
                                    Contacts {
                                        edges {
                                            node {
                                                Name {
                                                    value
                                                }
                                            }
                                        }
                                    }
                                    Cases {
                                        edges {
                                            node {
                                                CaseNumber {
                                                    value
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `,
        variables: "$variables"
    })
    wiredValues(result) {
        // We hold a direct reference to the graphQL query result
        // so that we can refresh it with refreshGraphQL
        console.log('Results....' + JSON.stringify(result, null, 4));
        this.contacts = result;
    }

    /**
     * Since GraphQL variable values are nested within an object, a getter function
     * must be used to make the variables reactive. LWC will re-run this function &
     * re-evaluate the GraphQL query when the component properties referenced in
     * this function change.
     */
    get variables() {
        return {
            recordId: this.recordId
        };
    }

    createNewContact() {
        const fields = {};
        fields[FIRSTNAME_FIELD.fieldApiName] = this.randomString;
        fields[LASTNAME_FIELD.fieldApiName] = "Last Name";
        fields[ACCOUNT_FIELD.fieldApiName] = this.recordId;
        const recordInput = { apiName: CONTACT_OBJECT.objectApiName, fields };
        createRecord(recordInput)
            .then((contact) => {
                console.log(JSON.stringify(contact, null, 4));
                this.contactId = contact.id;
                const name = `${getFieldValue(
                    contact,
                    FIRSTNAME_FIELD
                )} ${getFieldValue(contact, LASTNAME_FIELD)}`;
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Success",
                        message: `Contact created "${name}"`,
                        variant: "success"
                    })
                );
                this.handleRefresh();
            })
            .catch((error) => {
                console.log(error.body);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Error creating record",
                        message: error.body.message,
                        variant: "error"
                    })
                );
            });
    }

    get randomString() {
        return (Math.random() + 1).toString(36).substring(5);
    }

    async handleRefresh() {
        // refresh the GraphQL results..
        await refreshGraphQL(this.contacts);
        // refresh the Standard Related Lists
        this.dispatchEvent(new RefreshEvent());
    }
}
