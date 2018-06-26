import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as FilterItemActions from './actions';
// import Select from 'react-select';
import Select from 'react-super-select';
import moment from 'moment';
import { DateRangePicker, SingleDatePicker, DayPickerRangeController } from 'react-dates';

import { CheckboxGroup, Checkbox } from 'react-checkbox-group';
import { SortItem } from '../SortItem';
import AutoCompleteSelect from '../AutoCompleteSelect';

class FilterItem extends Component { // eslint-disable-line react/prefer-stateless-function
    constructor(props) {
        super(props)
        this.state = {
            focusedInput: null,
            lastFocusedInput: null,
            FilterComponent: ''
        };

        this.makeFilter = this.makeFilter.bind(this);
        this.onSelectChange = this.onSelectChange.bind(this);
        this.onSortClick = this.onSortClick.bind(this);
        this.makeSelectInitialValue = this.makeSelectInitialValue.bind(this);
    }

    componentWillMount(){
        let self = this;
        this.makeFilter(this.props.options)
            .then(FilterComponent => {
                self.setState({FilterComponent});
            });
    }

    componentWillReceiveProps(nextProps){
        let self = this;
        if(nextProps !== this.props) {
            this.makeFilter(this.props.options)
                .then(FilterComponent => {
                    self.setState({FilterComponent});
                });
        }
    }

    onSelectChange(data) {
        const self = this,
            { options, selectedView, filterChange } = this.props,
            value = (data && Array.isArray(data)) ?
                // (Array.isArray(data[0].entityUUID)  ? data[0].entityUUID :
                data.map(obj => {
                    return obj[options.options.key];
                }) :
                (data ? [data[options.options.key]] : null);

        filterChange({
            id: options.id,
            view: selectedView.id,
            value
        });
    }

    onSortClick(direction) {
        const self = this;
        const { options, selectedView, filterChange } = this.props;

        filterChange({
            id: options.id,
            view: selectedView.id,
            value: direction
        });
    }

    /**
     * Returned as moment objects
     * @param startDate
     * @param endDate
     */
    onRangeChange({ startDate, endDate }) {
        const { options, selectedView, filterChange } = this.props;

        if (startDate) {
            let local = moment(startDate.utc()).local();

            filterChange({
                id: `${options.id}--start`,
                view: selectedView.id,
                value: local.unix() * 1000
                //value : parseInt(startDate.unix()+'000',10)
            });
        }

        if (endDate) {
            let local = moment(endDate.utc()).local();

            filterChange({
                id: `${options.id}--end`,
                view: selectedView.id,
                value: local.unix() * 1000
            });
        }
    }

    onRangeReset(e) {
        e.preventDefault();
        const { options, selectedView, filterChange } = this.props;

        filterChange([
            {
                id: `${options.id}--start`,
                view: selectedView.id,
                value: null
            },
            {
                id: `${options.id}--end`,
                view: selectedView.id,
                value: null
            }
        ]);
    }

    onRangeFocusChange(focusedInput) {

        // State loop bug fix for dates component
        if (this.state.lastFocusedInput !== focusedInput) {
            this.setState({ lastFocusedInput: focusedInput, focusedInput });
        }
    }

    handleCheckboxChange(options, values) {
        const { selectedView, filterChange } = this.props,
            optValues = options.options.getOptions();
        let value = [];

        optValues.forEach(collectionItem => {
            values.forEach(checkVal => {
                if (checkVal == collectionItem[options.options.key]) {
                    value.push(collectionItem[options.options.key]);
                }
            });
        });

        filterChange({
            id: options.id,
            view: selectedView.id,
            value: value.length > 0 ? JSON.stringify(value) : null
        });
    }

    makeFilter(options) {
        const self = this;
        return new Promise((resolve, reject) => {
            const selectValue = {
                label: 'test',
                value: self.props.options.value
            };

            switch (self.props.options.type) {
                case 'range':
                    resolve([
                        (<span key={Math.random() * 100000} className="dl__filterItemRangeClear"><a href="#" onClick={self.onRangeReset.bind(self)}>reset</a></span>),
                        (<DateRangePicker
                            key={Math.random() * 100000}
                            startDate={options.range.start ? moment(options.range.start * 1) : moment()} // .momentObj or null,
                            endDate={options.range.end ? moment(options.range.end * 1) : moment()} // .momentObj or null,
                            onDatesChange={self.onRangeChange.bind(self)} // .func.isRequired,
                            focusedInput={self.state.focusedInput} // .oneOf([START_DATE, END_DATE]) or null,
                            onFocusChange={self.onRangeFocusChange.bind(self)} // .func.isRequired,
                            isOutsideRange={() => false}
                        />)]);
                    break;
                case 'checkbox':
                    let vals = [...decodeURIComponent(self.props.options.value)];

                    // Handle reading url values @todo: fix the read later when we get more time
                    if (vals[0] === "[" || (vals[0] === "n" && vals[1] === "u")) {
                        vals = vals.join('');
                    }

                    try {
                        vals = JSON.parse(vals);
                    } catch (e) { }

                    vals = vals === 'null' ? null : vals;

                    //@todo .need to spend some time looking at why this component won't render checked values if the first render had no values.
                    resolve (<CheckboxGroup name={options.id} values={vals} onChange={this.handleCheckboxChange.bind(this, options)}>
                        <div className="dl__filterItemCheckbox">{
                            options.options.getOptions().map(option => {
                                return (<label key={Math.random() * 10000}><Checkbox value={option[options.options.key]} />{option[options.options.value]}</label>);
                            })
                        }</div>
                    </CheckboxGroup>);
                    break;
                case 'sort':
                    resolve (<SortItem options={self.props.options} onClick={this.onSortClick} />);
                    break;
                case 'autocomplete':
                    resolve(<AutoCompleteSelect
                        onSelectChange={self.onSelectChange}
                        initalValues={options.value}
                        placeholder={options && options.placeholder ? options.placeholder : null}
                        {...options} />);
                    break;
                case 'select':
                default:
                    let val = null;
                    let defaults = self.props.selectedView.filterDefaults ? self.props.selectedView.filterDefaults() : false;
                    try { defaults = JSON.parse(defaults) }
                    catch (e) { }

                    if(!defaults){
                        options.options.getOptions()
                            .then(asyncDefaults => {
                                defaults = asyncDefaults;
                                resume(defaults);
                            });
                    } else {
                        resume(defaults);
                    }
                // Decipher what set of defaults are to be used in the component options list
                // Most likely LEGACY
                // if (defaults) {
                //   if (options.options && options.options.defaultsKey) {
                //     val = defaults[options.options.defaultsKey] ? defaults[options.options.defaultsKey].filter(item => item[options.options.key] == self.props.options.value)[0] : null;
                //   } else {
                //     val = defaults[options.id] ? defaults[options.id].filter(item => item[options.options.key] == self.props.options.value)[0] : null;
                //   }
                // }

            }
            function resume(defaults) {

                // If a value exist via a query string run or state update, set the component initial val, otherwise leave blank to display the placeholder
                if (self.props.options.value) {
                    resolve (
                        <Select
                            optionLabelKey={options.options.value}
                            optionValueKey={options.options.key}
                            multiple={options.multi}
                            initialValue={self.makeSelectInitialValue(options, defaults)}
                            placeholder="Make Your Selections"
                            onChange={(data) => self.onSelectChange(data)}
                            searchable={false}
                            dataSource={defaults}
                        />
                    );
                } else {
                    resolve (
                        <Select
                            optionLabelKey={options.options.value}
                            optionValueKey={options.options.key}
                            multiple={options.multi}
                            placeholder="Make Your Selections"
                            onChange={(data) => self.onSelectChange(data)}
                            searchable={false}
                            dataSource={defaults}
                        />
                    );
                }
            }
        });
    }

    /**
     * Makes the select components initial values based on either an incoming array of ids or a collection
     * @param {*} options
     */
    makeSelectInitialValue(options, defaults) {
        const self = this;

        console.log('RFL OPTIONS', self.props.options.value, defaults);
        const initVals = self.props.options.value.map(v => {
            // Props option id has to match a key that's in the defaults
            const defaultsExtract = (defaults[self.props.options.id] || [])
                .filter(def => def[options.options.key] == v)[0];

            return {
                [options.options.key]: v, // entityUUID
                [options.options.value]: (defaultsExtract ? defaultsExtract[options.options.value] : null)
            };

        });// entityValue


        return initVals;
    }

    render() {
        const { options, config, selectedView } = this.props;
        const classNames = `dl__filterItem ${options.id}`;

        return (
            <div className={classNames}>
                <label htmlFor={options.id}>{options.label}</label>
                {this.state.FilterComponent}
            </div>
        );
    }
}

//Which part of the Redux global state does our component want to receive as props?
function mapStateToProps(state, ownProps) {
    return {
        config: state.app.config,
        force: state.app.force,
        filterItem: state.filterItem
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators(FilterItemActions, dispatch);
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(FilterItem);