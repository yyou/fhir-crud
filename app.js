
Vue.component('fhir-resource-view', {
    template: `
        <div>
            <div v-show="mode === 'view'">
                <pre style="width: 100%; height: 400px;">{{viewModel.resourceJson}}</pre>
                <button class="btn btn-default" @click="edit">Edit</button>
            </div>
            <div v-show="mode === 'edit'">
                <textarea v-model="viewModel.resourceJson" style="width: 100%; height: 400px;"></textarea>
                <button class ="btn btn-default" v-on:click="save">Save</button>
                <button class ="btn btn-default" v-on:click="cancel">Cancel</button>
            </div>
            <div v-show="mode === 'create'">
                <textarea v-model="viewModel.resourceJson" style="width: 100%; height: 400px;"></textarea>
                <button class ="btn btn-default" v-on:click="save">Save</button>
                <button class ="btn btn-default" v-on:click="cancel">Cancel</button>
            </div>
        </div>
    `,
    props: ['viewModel'],
    data: function () {
        return {
            mode: 'view'
        };
    },
    methods: {
        edit: function () {
            var resource = JSON.parse(this.viewModel.resourceJson);
            if (resource.id) {
                this.mode = 'edit';
            } else {
                this.mode = 'create';
            }
        },
        cancel: function () {
            this.mode = 'view';
        },
        save: function () {
            var resource = JSON.parse(this.viewModel.resourceJson);
            if (resource.id && this.mode === 'create') {
                alert('you should not give it an id when creating a new resource.');
                return;
            }
            this.$emit('save', resource);
            this.mode = 'view';
        }
    }
});

Vue.http.interceptors.push(function (request, next) {
    // modify headers
    request.headers.set('Access-Control-Allow-Origin');

    // continue to next interceptor
    next();
});

Vue.component('fhirResource', {
    template: `
                <tr>
                    <td><a href="#" @click.prevent="viewResource(id)">{{id}}</a></td>
                    <td>{{resourceType}}</td>
                    <td>{{name}}</td>
                    <td><a href="#" @click.prevent="deleteResource(id)">Delete</a></td>
                </tr>
            `,
    props: ['model'],
    data: function () {
        return {
            id: this.model.id,
            resourceType: this.model.resourceType
        };
    },
    methods: {
        deleteResource: function (resourceId) {
            this.$emit('deleteresource', resourceId);
        },
        editResource: function (resourceId) {
            this.$emit('editresource', resourceId);
        },
        viewResource: function (resourceId) {
            this.$emit('viewresource', resourceId);
        }
    },
    computed: {
        name: function () {
            var resource = this.model;
            if (!resource.name) {
                //for HealthcareService
                if (resource.serviceName) {
                    return resource.serviceName;
                }

                return '[Name not provided]';
            }

            //for Location
            if (typeof resource.name === 'string') {
                return resource.name;
            }

            if (typeof resource.name === 'object' && resource.name.length) {
                var name1 = resource.name[0];
                //for Patient and Practitioner
                if (name1.family && name1.family.length &&
                    name1.given && name1.given.length) {
                    return name1.given[0] + ' ' + name1.family[0];
                }
            }
            return '[Name not provided]';
        }
    }
});

var fhir = new Vue({
    el: '#fhir',
    data: {
        baseUrl: 'http://localhost/spark/fhir/',
        resourceType: 'Patient',
        resources: [],
        currentResource: {},
        mode: 'view'
    },
    computed: {
        resourceUrl: function () {
            return this.baseUrl + this.resourceType + '/';
        },
        currentResourceModel: function () {
            return {
                resourceJson: JSON.stringify(this.currentResource, null, 2)
            };
        }
    },
    methods: {
        changeResourceType: function (resourceType) {
            this.resourceType = resourceType;
            this.currentResource = {};
            this.getAllResources();
        },
        getResource: function (resourceId) {
            var vm = this;
            this.$http.get(this.resourceUrl + resourceId).then(response => {
                vm.currentResource = response.data;
            });
        },
        getAllResources: function () {
            var vm = this;
            this.$http.get(this.resourceUrl).then(response => {
                vm.resources = [];
                if (response.data.total === 0) {
                    return;
                }
                var entries = response.data.entry;
                for (var n = 0; n < entries.length; ++n) {
                    vm.resources.push(entries[n].resource);
                }
            });
        },
        deleteResource: function (resourceId) {
            if (!resourceId) {
                return;
            }
            var vm = this;
            this.$http.delete(this.resourceUrl + resourceId).then(response => {
                var index = -1;
                for (var n = 0; n < vm.resources.length; ++n) {
                    if (vm.resources[n].id == resourceId) {
                        index = n;
                        break;
                    }
                }
                if (index != -1) {
                    vm.resources.splice(index, 1);
                }
            });
        },
        createResource: function () {
            this.currentResource = {
                'resourceType': this.resourceType
            };
        },
        save: function (resource) {
            var vm = this;
            var id = resource.id;
            if (id) {
                //for editing existing one.                        
                this.$http.put(this.resourceUrl + id, resource)
                    .then(response => {
                        vm.currentResource = response.data;
                        var idx = this.findIndex(vm.currentResource.id);
                        if (idx != -1) {
                            vm.resources[idx] = vm.currentResource;
                        }
                    });
            } else {
                //for creating new one
                this.$http.post(this.resourceUrl, resource).then(response => {
                    vm.currentResource = response.data;
                    vm.resources.push(response.data);
                });
            }
        },
        findIndex: function (id) {
            var index = -1;
            for (var n = 0; n < this.resources.length; ++n) {
                if (this.resources[n].id == id) {
                    index = n;
                    break;
                }
            }
            return index;
        }
    }
});

fhir.getAllResources();
