import React, { Component } from 'react';

import './_wickcodedetailspanel.scss';
import '../_popoutcodeditor.scss';

class WickCodeDetailsPanel extends Component {

  render () {
    return (
      <div className='code-editor-details-panel'>
        <div className='code-editor-thumbnail-preview'>
        </div>
        <div className='code-editor-reference'>
        </div>
      </div>
    );
  }

}

export default WickCodeDetailsPanel;