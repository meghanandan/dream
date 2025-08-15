const formDataSchema = {
    feilds: [{
        id: 1,
        name: 'role_name',
        text: 'Role Name',
        visible: true,
        element: 'input',
        required: true,
        input_type: 'text',
        placeholder: 'Enter',
        icon: 'user',
        rules: [
            {
                test: (value) => value !== null && value.length > 0,
                message: 'Please Enter Role Name',
            },
        ],
        
        errors: [],
        value: null,
        valid: false,
        state: '',
        disable: false,
        className: 'col-4'
    }, {
        id: 2,
        name: 'rolePageTable',
        text: 'Add Role',
        visible: true,
        required: false,
        element: 'table',
        input_type: 'button',
        disable: false,
        colums: [
            {
                id: 1,
                name: 'Page Name'
            }, {
                id: 2,
                name: 'View'
            }, {
                id: 3,
                name: 'Edit'
            }, {
                id: 6,
                name: 'Add'
            }, {
                id: 4,
                name: 'Delete'
            }, {
                id: 5,
                name: 'Download'
            }
        ]
    }
    ]
}

export { formDataSchema };