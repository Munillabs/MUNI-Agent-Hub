/* MUNI Agent Hub 웹 파트
   SharePoint 페이지에 Hub를 그리고, 웹 파트 설정 창에서 목록이 있는 사이트와 목록 이름을 바꿀 수 있게 합니다. */
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPComponentLoader } from '@microsoft/sp-loader';
import * as strings from 'MuniAgentHubWebPartStrings';

import MuniAgentHub, { IMuniAgentHubProps } from './components/MuniAgentHub';
import { HubService } from './services/HubService';

export interface IMuniAgentHubWebPartProps {
  siteUrl: string;
  agentsList: string;
  requestsList: string;
  ideasList: string;
  insightsList: string;
  reactionsList: string;
  showHeader: boolean;
  logoUrl: string;
  loadBrandFonts: boolean;
}

export default class MuniAgentHubWebPart extends BaseClientSideWebPart<IMuniAgentHubWebPartProps> {
  private service: HubService | undefined;
  private serviceKey: string = '';

  protected onInit(): Promise<void> {
    if (this.properties.loadBrandFonts !== false) {
      // Pretendard (한국어 UI용 글꼴, SIL OFL). 회사 정책으로 CDN이 막혀 있으면 Segoe UI·맑은 고딕으로 표시됩니다.
      try {
        SPComponentLoader.loadCss('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
      } catch (e) { /* 글꼴 없이 계속 */ }
    }
    return super.onInit();
  }

  private getService(): HubService {
    const site = (this.properties.siteUrl || '').trim() || this.context.pageContext.web.absoluteUrl;
    const lists = {
      agents: this.properties.agentsList || 'Agent Catalog',
      requests: this.properties.requestsList || 'Agent Requests',
      ideas: this.properties.ideasList || 'Idea Board',
      insights: this.properties.insightsList || 'Agent Insights',
      reactions: this.properties.reactionsList || 'Hub Reactions'
    };
    const key = [site, lists.agents, lists.requests, lists.ideas, lists.insights, lists.reactions].join('|');
    if (!this.service || key !== this.serviceKey) {
      this.service = new HubService(this.context.spHttpClient, site, lists);
      this.serviceKey = key;
    }
    return this.service;
  }

  public render(): void {
    const props: IMuniAgentHubProps = {
      service: this.getService(),
      siteUrl: (this.properties.siteUrl || '').trim() || this.context.pageContext.web.absoluteUrl,
      showHeader: this.properties.showHeader !== false,
      logoUrl: (this.properties.logoUrl || '').trim()
    };
    ReactDom.render(React.createElement(MuniAgentHub, props), this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  // 설정 창에서 글자를 입력할 때마다 다시 그리지 않고 '적용'을 눌렀을 때 반영합니다.
  protected get disableReactivePropertyChanges(): boolean {
    return true;
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [{
        header: { description: strings.PropertyPaneDescription },
        groups: [
          {
            groupName: strings.DataGroupName,
            groupFields: [
              PropertyPaneTextField('siteUrl', { label: strings.SiteUrlLabel, description: strings.SiteUrlDescription, placeholder: 'https://contoso.sharepoint.com/sites/AgentHub' }),
              PropertyPaneTextField('agentsList', { label: strings.AgentsListLabel, placeholder: 'Agent Catalog' }),
              PropertyPaneTextField('requestsList', { label: strings.RequestsListLabel, placeholder: 'Agent Requests' }),
              PropertyPaneTextField('ideasList', { label: strings.IdeasListLabel, placeholder: 'Idea Board' }),
              PropertyPaneTextField('insightsList', { label: strings.InsightsListLabel, placeholder: 'Agent Insights' }),
              PropertyPaneTextField('reactionsList', { label: strings.ReactionsListLabel, placeholder: 'Hub Reactions' })
            ]
          },
          {
            groupName: strings.DisplayGroupName,
            groupFields: [
              PropertyPaneToggle('showHeader', { label: strings.ShowHeaderLabel, onText: strings.On, offText: strings.Off }),
              PropertyPaneTextField('logoUrl', { label: strings.LogoUrlLabel, description: strings.LogoUrlDescription, placeholder: 'https://munilabskr.sharepoint.com/sites/AgentHub/SiteAssets/muni-logo.png' }),
              PropertyPaneToggle('loadBrandFonts', { label: strings.BrandFontsLabel, onText: strings.On, offText: strings.Off })
            ]
          }
        ]
      }]
    };
  }
}
