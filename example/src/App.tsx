import React, { useState } from 'react'
import { SafeAreaView, Text, TouchableOpacity } from 'react-native'
import FlashDragList from "react-native-flashdrag-list"
import { GestureHandlerRootView } from 'react-native-gesture-handler'

interface Item {
  title: string,
  color: string
}

const NUM_ITEMS = 200
const ITEM_HEIGHT = 60

const App = () => {

  const [ data, setData ] = useState(() => {
    return new Array(NUM_ITEMS).fill("").map((_, i) => {
      const colors = [ '#493548', '#4B4E6D', '#6A8D92', '#80B192', '#A1E887' ]
      return {
        title: "Item " + i,
        color: colors[Math.round(i % colors.length)]
      }
    }) as Array<Item>
  })

  const onSort = (fromIndex: number, toIndex: number) => {
    const copy = [...data]
    const removed = copy.splice(fromIndex, 1)
    copy.splice(toIndex, 0, removed[0]!)
    setData(copy)
  }

  const renderItem = (item: Item, index: number, isActive: boolean, beginDrag: () => any) => {
    return (
      <TouchableOpacity
        onLongPress={beginDrag}
        activeOpacity={0.9}
        style={{
          width: '100%',
          height: ITEM_HEIGHT,
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingHorizontal: '10%',
          backgroundColor: item.color
        }}
      >
        <Text
          style={{
            color: 'white',
            fontWeight: 'bold'
          }}
          key={index}
        >{item.title}{isActive ? ' (active)' : ''}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <GestureHandlerRootView style={{
      flex: 1
    }}>
      <SafeAreaView style={{
        flex: 1,
        height: '100%',
        backgroundColor: 'white'
      }}>
        <FlashDragList
          data={data}
          renderItem={renderItem}
          itemsSize={ITEM_HEIGHT}
          onSort={onSort}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default App
