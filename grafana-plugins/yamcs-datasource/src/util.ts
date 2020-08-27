import { getBackendSrv } from '@grafana/runtime';

export async function fetchCascaderOptions(proxyUrl: string) {
  // FLAT OPTIONS ARE GOOD : just run populate with sublist
  let spaceSystem = await fetchSpaceSystem(proxyUrl); // get spaceSystem = parameter directories
  let target: any = [];
  BFS(spaceSystem, target); // clean, rename and flatten spaceSystem into target
  makeTree(target); // make tree of directories
  let flatParameters = await fetchParameters(proxyUrl); // fetch the parameters
  populateParameters(flatParameters, { value: '', items: target }); // add parameters them to their directories
  return target;
}

async function fetchSpaceSystem(proxyUrl: string) {
  // get all the
  const routePath = '/instance';
  const url = proxyUrl + routePath;
  let response = await getBackendSrv().datasourceRequest({
    url: url,
    method: 'GET',
  }); // TODO : handle errors ?
  let o = response.data.missionDatabase.spaceSystem;
  return { name: '', sub: o };
}

function BFS(start: any, target: any) {
  let queue: any = [];
  let o = start;
  while (o) {
    if (o.sub) {
      o.sub.forEach((e: any) => {
        queue.push(e);
        target.push({ label: e.name, value: e.qualifiedName, items: [] });
      });
    }
    // we change object here
    o = queue.shift();
  }
}

function makeTree(target: any) {
  // TODO : some names appear twice
  let parentName = true;
  while (parentName) {
    let elem = target[target.length - 1];
    let parentName = elem.value.substring(0, elem.value.lastIndexOf('/'));
    let parent = target.find((e: any) => {
      return e.value === parentName;
    });
    if (parent) {
      parent.items.push(elem);
      target.pop();
    } else {
      break;
    }
  }
}

async function fetchParameters(proxyUrl: string) {
  // return a list with all the parameters

  let params: any = [];
  const routePath = '/param';
  const baseUrl = proxyUrl + routePath;

  let i = 0;
  let suffix = `?pos=${i}&limit=1000`;
  let url = baseUrl + suffix;
  let response = await getBackendSrv().datasourceRequest({
    url: url,
    method: 'GET',
  });
  if (!response.data) {
    return params;
  }

  params.push(...response.data.parameters);
  for (i = 1000; i < response.data.totalSize; i += 1000) {
    let suffix = `?pos=${i}&limit=1000`;
    let url = baseUrl + suffix;
    let response = await getBackendSrv().datasourceRequest({
      url: url,
      method: 'GET',
    });
    if (!response.data) {
      break;
    }
    params.push(...response.data.parameters);
  }
  return params;
}

function populateParameters(flatParameters: any, target: any) {
  let lastParentName = '';
  let elem;
  for (let p of flatParameters) {
    // make object
    let paramObject: any = { label: p.name, value: p.qualifiedName, items: [] };
    // if aggregate : add its composites as children
    if (p.type && p.type.engType === 'aggregate') {
      console.log('p is aggregate');
      p.type.member.forEach((item: any) => {
        paramObject.items.push({ label: item.name, value: `${p.qualifiedName}.${item.name}`, items: [] });
      });
    }
    // find parent in target
    let parentName = paramObject.value.substring(0, paramObject.value.lastIndexOf('/'));
    if (parentName !== lastParentName) {
      // need to find the new parent
      elem = findByName(target, parentName); // maybe inefficient to go through all but should work. TODO : look repertory after other. TODO : handle parent not found.
      lastParentName = parentName;
    } // otherwise use previous parent
    // console.log(elem);
    elem.items.push(paramObject);
  }
}

export function findByName(o: any, value: any) {
  //Early return
  if (o.value === value) {
    return o;
  }
  // not him : see children
  var result;
  if (o.hasOwnProperty('items')) {
    o.items.some((item: any) => {
      result = findByName(item, value);
      if (result) {
        console.log('found');
        return result;
      }
    });
  }
  return result;
}

// function reset() {
//   o = {
//     name: '',
//     sub: [
//       {
//         name: 'YSS',
//         qualifiedName: '/YSS',
//         version: '1.3',
//         sub: [
//           {
//             name: 'SIMULATOR',
//             qualifiedName: '/YSS/SIMULATOR',
//             version: '1.2',
//             history: [
//               {
//                 version: '1.0',
//                 date: '',
//                 message: 'Initial version',
//                 author: '',
//               },
//               {
//                 version: '1.1',
//                 date: '12-Jan-2017',
//                 message:
//                   'Updated to format 5.4 (the opsname is not anymore generated automatically but is not needed anyway)',
//                 author: '',
//               },
//               {
//                 version: '1.2',
//                 date: '12-Jun-2017',
//                 message: 'Added “a” flag to the container flags in order to have them used for archiving partitions.',
//                 author: '',
//               },
//             ],
//           },
//         ],
//       },
//       {
//         name: 'TSE',
//         qualifiedName: '/TSE',
//         shortDescription: 'Test Support Equipment',
//         sub: [
//           {
//             name: 'simulator',
//             qualifiedName: '/TSE/simulator',
//             version: '1.2',
//           },
//         ],
//       },
//       {
//         name: 'perf-data',
//         qualifiedName: '/perf-data',
//       },
//       {
//         name: 'yamcs',
//         qualifiedName: '/yamcs',
//         sub: [
//           {
//             name: 'cmd',
//             qualifiedName: '/yamcs/cmd',
//             sub: [
//               {
//                 name: 'arg',
//                 qualifiedName: '/yamcs/cmd/arg',
//               },
//             ],
//           },
//           {
//             name: 'cmdHist',
//             qualifiedName: '/yamcs/cmdHist',
//           },
//           {
//             name: 'processor',
//             qualifiedName: '/yamcs/processor',
//           },
//           {
//             name: '000201-ws',
//             qualifiedName: '/yamcs/000201-ws',
//             sub: [
//               {
//                 name: 'df',
//                 qualifiedName: '/yamcs/000201-ws/df',
//                 sub: [
//                   {
//                     name: 'dev',
//                     qualifiedName: '/yamcs/000201-ws/df/dev',
//                     sub: [
//                       {
//                         name: 'sda5',
//                         qualifiedName: '/yamcs/000201-ws/df/dev/sda5',
//                       },
//                     ],
//                   },
//                 ],
//               },
//               {
//                 name: 'tm_realtime',
//                 qualifiedName: '/yamcs/000201-ws/tm_realtime',
//               },
//               {
//                 name: 'tc_sim',
//                 qualifiedName: '/yamcs/000201-ws/tc_sim',
//               },
//               {
//                 name: 'tm2_realtime',
//                 qualifiedName: '/yamcs/000201-ws/tm2_realtime',
//               },
//               {
//                 name: 'tm_dump',
//                 qualifiedName: '/yamcs/000201-ws/tm_dump',
//               },
//               {
//                 name: 'TSE',
//                 qualifiedName: '/yamcs/000201-ws/TSE',
//               },
//               {
//                 name: 'cmdQueue',
//                 qualifiedName: '/yamcs/000201-ws/cmdQueue',
//                 sub: [
//                   {
//                     name: 'supervised',
//                     qualifiedName: '/yamcs/000201-ws/cmdQueue/supervised',
//                   },
//                   {
//                     name: 'default',
//                     qualifiedName: '/yamcs/000201-ws/cmdQueue/default',
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//       },
//     ],
//   };
//   target = [];
//   BFS(o, target);
//   makeTree(target);
//   treeParameters({ value: '', items: target });
// }

// function makeTree(target){
//   parentName = true;
//   while (parentName){
//     elem = target[target.length - 1];
//     parentName = elem.value.substring(0, elem.value.lastIndexOf('/') );
//     parent = target.find(e => {return e.value === parentName})
//     if (parent) {
//       parent.items.push(elem)
//       target.pop()
//     } else {
//       break;
//     }
//
//   }
//   for (let elem of target){
//     if (elem.label === "yamcs"){continue};
//     setTimeout(function(elem_copy) {
//       return function() {
//         elem_copy.items.push({label: `child of : ${elem_copy.value}`})
//       };
//     } (elem), 1000);
//   }
// }
