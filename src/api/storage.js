/*
 * Store assessment data in localstorage
 *
 * Copyright (C) 2017 Jesse Yang <hello@yjc.me>
 *
 * Distributed under terms of the MIT license.
 */

import forage from 'localforage'

const storage = {
  load (key) {
    return forage.getItem('releval:' + key)
  },
  dump (key, val) {
    return forage.setItem('releval:' + key, val)
  }
}

/**
 * Get and set configs stored in local storage
 */
export default storage
